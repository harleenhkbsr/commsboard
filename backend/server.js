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

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});