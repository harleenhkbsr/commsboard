require('dotenv').config();

const express = require('express');
const db = require('./db.js');

const app = express();

app.use(express.json());


// --------------------------------------------------
// CREATE A BOARD
// --------------------------------------------------

app.post('/api/boards', (req, res) => {
  const { notionDatabaseId, name } = req.body;

  const stmt = db.prepare(`
    INSERT INTO boards (notionDatabaseId, name)
    VALUES (?, ?)
  `);

  const result = stmt.run(notionDatabaseId, name);

  const board = db.prepare(`
    SELECT * FROM boards
    WHERE id = ?
  `).get(result.lastInsertRowid);

  res.json(board);
});


// --------------------------------------------------
// GET ALL BOARDS
// --------------------------------------------------

app.get('/api/boards', (req, res) => {
  const boards = db.prepare(`
    SELECT * FROM boards
  `).all();

  res.json(boards);
});


// --------------------------------------------------
// GET CARDS FOR A BOARD
// --------------------------------------------------

app.get('/api/boards/:id/cards', (req, res) => {
  const boardId = req.params.id;
  const memberId = req.query.memberId;

  let cards;

  if (memberId) {
    cards = db.prepare(`
      SELECT * FROM cards_snapshot
      WHERE boardId = ?
        AND assignedMemberId = ?
    `).all(boardId, memberId);
  } else {
    cards = db.prepare(`
      SELECT * FROM cards_snapshot
      WHERE boardId = ?
    `).all(boardId);
  }

  res.json(cards);
});


// --------------------------------------------------
// GET MEMBERS FOR A BOARD
// --------------------------------------------------

app.get('/api/boards/:id/members', (req, res) => {
  const boardId = req.params.id;

  const members = db.prepare(`
    SELECT DISTINCT
      assignedMemberId,
      assignedMemberName
    FROM cards_snapshot
    WHERE boardId = ?
      AND assignedMemberId IS NOT NULL
  `).all(boardId);

  res.json(members);
});


// --------------------------------------------------
// SYNC BOARD FROM NOTION
// --------------------------------------------------

app.post('/api/boards/:id/sync', async (req, res) => {
  try {
    const boardId = req.params.id;

    // Find the board
    const board = db.prepare(`
      SELECT * FROM boards
      WHERE id = ?
    `).get(boardId);

    if (!board) {
      return res.status(404).json({
        error: 'Board not found'
      });
    }


    // --------------------------------------------------
    // GET CURRENT PAGES FROM NOTION
    // --------------------------------------------------

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


    // Handle Notion API errors
    if (!response.ok) {
      const error = await response.text();

      return res.status(response.status).json({
        error: 'Notion API request failed',
        details: error
      });
    }


    const data = await response.json();


    // --------------------------------------------------
    // GET THE NOTION PAGE IDS
    // --------------------------------------------------

    const notionPageIds = data.results.map(page => page.id);


    // --------------------------------------------------
    // UPSERT CURRENT NOTION CARDS
    // --------------------------------------------------

    const stmt = db.prepare(`
      INSERT INTO cards_snapshot (
        boardId,
        notionPageId,
        schoolName,
        status,
        assignedMemberId,
        assignedMemberName,
        tag,
        label,
        lastEditedTime
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

      ON CONFLICT(notionPageId)
      DO UPDATE SET
        boardId = excluded.boardId,
        schoolName = excluded.schoolName,
        status = excluded.status,
        assignedMemberId = excluded.assignedMemberId,
        assignedMemberName = excluded.assignedMemberName,
        tag = excluded.tag,
        label = excluded.label,
        lastEditedTime = excluded.lastEditedTime,
        lastSyncedAt = CURRENT_TIMESTAMP
    `);


    // Process every Notion page
    for (const page of data.results) {
      const properties = page.properties;


      // School name
      const schoolName =
        properties.Name?.title?.[0]?.plain_text ?? null;


      // Status
      const status =
        properties.Status?.status?.name ?? null;


      // Assigned member
      const assignedMemberId =
        properties.Assign?.people?.[0]?.id ?? null;

      const assignedMemberName =
        properties.Assign?.people?.[0]?.name ?? null;


      // Tag
      const tag =
        properties.Tag?.select?.name ?? null;


      // Label
      const label =
        properties.Label?.select?.name ?? null;


      // Last edited time
      const lastEditedTime =
        page.last_edited_time ?? null;


      // Save/update the card
      stmt.run(
        boardId,
        page.id,
        schoolName,
        status,
        assignedMemberId,
        assignedMemberName,
        tag,
        label,
        lastEditedTime
      );
    }


    // --------------------------------------------------
    // DELETE CARDS THAT NO LONGER EXIST IN NOTION
    // --------------------------------------------------

    if (notionPageIds.length === 0) {

      // Notion database is empty,
      // so remove all cards for this board.
      db.prepare(`
        DELETE FROM cards_snapshot
        WHERE boardId = ?
      `).run(boardId);

    } else {

      // Build ?, ?, ?, ... for the Notion page IDs
      const placeholders = notionPageIds
        .map(() => '?')
        .join(', ');

      db.prepare(`
        DELETE FROM cards_snapshot
        WHERE boardId = ?
          AND notionPageId NOT IN (${placeholders})
      `).run(boardId, ...notionPageIds);
    }


    // --------------------------------------------------
    // GET UPDATED CARDS
    // --------------------------------------------------

    const cards = db.prepare(`
      SELECT * FROM cards_snapshot
      WHERE boardId = ?
    `).all(boardId);


    // --------------------------------------------------
    // SEND RESULT TO FRONTEND
    // --------------------------------------------------

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


// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});