const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('comms.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notionDatabaseId TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    addedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;