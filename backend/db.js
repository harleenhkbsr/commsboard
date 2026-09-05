const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('comms.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notionDatabaseId TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    addedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cards_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boardId INTEGER NOT NULL,
    notionPageId TEXT NOT NULL UNIQUE,
    schoolName TEXT,
    status TEXT,
    assignedMemberId TEXT,
    assignedMemberName TEXT,
    lastEditedTime TEXT,
    lastSyncedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boardId) REFERENCES boards(id)
  )
`);

module.exports = db;