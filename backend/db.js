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
    tag TEXT,
    label TEXT,
    lastEditedTime TEXT,
    lastSyncedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boardId) REFERENCES boards(id)
  )
`);

try {
  db.exec(`
    ALTER TABLE cards_snapshot
    ADD COLUMN tag TEXT
  `);
} catch (error) {
  // Column already exists
}

try {
  db.exec(`
    ALTER TABLE cards_snapshot
    ADD COLUMN label TEXT
  `);
} catch (error) {
  // Column already exists
}

try {
  db.exec(`
    ALTER TABLE cards_snapshot
    ADD COLUMN lastCommentTime TEXT
  `);
} catch (error) {
  // Column already exists
}

try {
  db.exec(`
    ALTER TABLE cards_snapshot
    ADD COLUMN latestCommentText TEXT
  `);
} catch (error) {
  // Column already exists
}

module.exports = db;