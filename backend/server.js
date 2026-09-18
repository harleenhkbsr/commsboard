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
    SELECT * FROM boards
    WHERE id = ?
  `).get(result.lastInsertRowid);

  res.json(board);
});

app.get('/api/boards', (req, res) => {
  const boards = db.prepare(`
    SELECT * FROM boards
  `).all();

  res.json(boards);
});

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

app.post('/api/boards/:id/sync', async (req, res) => {
  try {
    const boardId = req.params.id;

    const board = db.prepare(`
      SELECT * FROM boards
      WHERE id = ?
    `).get(boardId);

    if (!board) {
      return res.status(404).json({
        error: 'Board not found'
      });
    }

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

    const notionPageIds = data.results.map(page => page.id);

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
        lastEditedTime,
        lastCommentTime
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

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
        lastCommentTime = excluded.lastCommentTime,
        lastSyncedAt = CURRENT_TIMESTAMP
    `);

    for (const page of data.results) {
      const properties = page.properties;

      const schoolName =
        properties.Name?.title?.[0]?.plain_text ?? null;

      const status =
        properties.Status?.status?.name ?? null;

      const assignedMemberId =
        properties.Assign?.people?.[0]?.id ?? null;

      const assignedMemberName =
        properties.Assign?.people?.[0]?.name ?? null;

      const tag =
        properties.Tag?.select?.name ?? null;

      const label =
        properties.Label?.select?.name ?? null;

      const lastEditedTime =
        page.last_edited_time ?? null;

      // Fetch comments for this Notion page
      const commentsResponse = await fetch(
        `https://api.notion.com/v1/comments?block_id=${page.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!commentsResponse.ok) {
        const error = await commentsResponse.text();

        throw new Error(
          `Failed to fetch comments for page ${page.id}: ${error}`
        );
      }

      const commentsData = await commentsResponse.json();
      const comments = commentsData.results || [];

      // Find the most recent comment
      const lastCommentTime = comments.reduce(
        (latest, comment) => {
          if (!comment.created_time) {
            return latest;
          }

          if (!latest || comment.created_time > latest) {
            return comment.created_time;
          }

          return latest;
        },
        null
      );

      stmt.run(
        boardId,
        page.id,
        schoolName,
        status,
        assignedMemberId,
        assignedMemberName,
        tag,
        label,
        lastEditedTime,
        lastCommentTime
      );
    }

    if (notionPageIds.length === 0) {
      db.prepare(`
        DELETE FROM cards_snapshot
        WHERE boardId = ?
      `).run(boardId);
    } else {
      const placeholders = notionPageIds.map(() => '?').join(', ');

      db.prepare(`
        DELETE FROM cards_snapshot
        WHERE boardId = ?
          AND notionPageId NOT IN (${placeholders})
      `).run(boardId, ...notionPageIds);
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

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});