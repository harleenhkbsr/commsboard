require('dotenv').config();

const express = require('express');
const db = require('./db.js');

const app = express();

app.use(express.json());

app.post('/api/boards', (req, res) => {
  const { notionDatabaseId, name } = req.body;

  const stmt = db.prepare(`
    INSERT INTO boards (notionDatabaseId, name)
    VALUES (?, ?)
  `);

  const result = stmt.run(notionDatabaseId, name);

  const board = db.prepare(`
    SELECT * FROM boards WHERE id = ?
  `).get(result.lastInsertRowid);

  res.json(board);
});

app.get('/api/boards', (req, res) => {
  const boards = db.prepare(`
    SELECT * FROM boards
  `).all();

  res.json(boards);
});

app.post('/api/boards/:id/sync', async (req, res) => {
  try {
    const boardId = req.params.id;

    // Find the board
    const board = db.prepare(`
      SELECT * FROM boards WHERE id = ?
    `).get(boardId);

    if (!board) {
      return res.status(404).json({
        error: 'Board not found'
      });
    }

    // Query Notion
    const response = await fetch(
      `https://api.notion.com/v1/databases/${board.notionDatabaseId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();

      return res.status(response.status).json({
        error: 'Notion API request failed',
        details: error
      });
    }

    const data = await response.json();

    // Insert/update each card
const stmt = db.prepare(`
  INSERT INTO cards_snapshot (
    boardId,
    notionPageId,
    schoolName,
    status,
    assignedMemberId,
    assignedMemberName,
    lastEditedTime
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(notionPageId)
  DO UPDATE SET
    boardId = excluded.boardId,
    schoolName = excluded.schoolName,
    status = excluded.status,
    assignedMemberId = excluded.assignedMemberId,
    assignedMemberName = excluded.assignedMemberName,
    lastEditedTime = excluded.lastEditedTime,
    lastSyncedAt = CURRENT_TIMESTAMP
`);

for (const page of data.results) {
  const properties = page.properties;

  const schoolName =
    properties.Name?.title?.[0]?.plain_text ?? null;

  const status =
    properties.Status?.status?.name ?? null;

  const assignedMemberId =
    properties.Person?.people?.[0]?.id ?? null;

  const assignedMemberName =
    properties.Person?.people?.[0]?.name ?? null;

  const lastEditedTime =
    page.last_edited_time ?? null;
// TODO: add "Temperature" tag support (Hot/Cold/Mild select property)
// 1. db.js — add a `temperature TEXT` column to cards_snapshot
// 2. sync route — extract it: properties.Temperature?.select?.name ?? null
// 3. add `temperature` to the INSERT column list + placeholders (?)
// 4. add `temperature = excluded.temperature` to the ON CONFLICT DO UPDATE SET
// 5. pass `temperature` into stmt.run(...) in the same position as the column list

  stmt.run(
    boardId,
    page.id,
    schoolName,
    status,
    assignedMemberId,
    assignedMemberName,
    lastEditedTime
  );
}

    const cards = db.prepare(`
      SELECT * FROM cards_snapshot
      WHERE boardId = ?
    `).all(boardId);

    res.json({
      boardId: Number(boardId),
      syncedCount: data.results.length,
      cards: cards
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Failed to sync board',
      details: error.message
    });
  }
});

app.get('/api/boards/:id/cards', (req, res) => {
  const boardId = req.params.id;
  const memberId = req.query.memberId;

  let cards;
  
  if (memberId) {
    cards = db.prepare(`
      SELECT * FROM cards_snapshot
      WHERE boardId = ? AND assignedMemberId = ?
    `).all(boardId, memberId);
  } else {
    cards = db.prepare(`
      SELECT * FROM cards_snapshot
      WHERE boardId = ?
    `).all(boardId);
  }

  res.json(cards);
});

app.get('/api/boards/:id/members', (req, res) => {
  const boardId = req.params.id;

  const members = db.prepare(`
    SELECT DISTINCT assignedMemberId, assignedMemberName
    FROM cards_snapshot
    WHERE boardId = ?
      AND assignedMemberId IS NOT NULL
  `).all(boardId);

  res.json(members);
});

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});