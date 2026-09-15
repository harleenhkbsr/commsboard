# Comms Board Tracker

A dashboard that connects to a Notion comms board and shows weekly activity — which schools were contacted, which new cards were added, and (eventually) an AI-generated summary of the comments cold callers leave on each card.

## Why

The team keeps a Notion database of schools being cold-called. Cards get assigned to a caller, who logs progress in comments. This project pulls that data out of Notion into a browsable dashboard, filterable by team member, so activity doesn't have to be checked by scrolling through Notion directly.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via Node's built-in `node:sqlite` module
- **Frontend:** React (Vite) + Tailwind CSS + `lucide-react` — _(scaffolding in progress)_
- **External APIs:** Notion API (core integration); Google Gemini API planned for comment summarization (deprioritized until the core sync/dashboard is working)

## Project structure

comms-board-tracker/
backend/
server.js → Express app, routes
db.js → opens comms.db, creates tables
.env → NOTION_TOKEN, NOTION_DATABASE_ID (not committed)
package.json
frontend/
src/
App.jsx → top-level state (boardId, cards, members), fetch orchestration
api.js → fetch wrapper for all backend routes
components/
BoardSelector.jsx
MemberGroup.jsx → header row + collapse toggle, renders its CardList
CardList.jsx
Card.jsx
SyncButton.jsx
index.css
vite.config.js → Tailwind plugin + /api proxy to localhost:4000
package.json

## Data model

**`boards`**
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| notionDatabaseId | TEXT | unique |
| name | TEXT | |
| addedAt | TEXT | defaults to current timestamp |

**`cards_snapshot`**
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| boardId | INTEGER | FK → boards.id |
| notionPageId | TEXT | unique — upserted on re-sync |
| schoolName | TEXT | from the card's title property |
| status | TEXT | from the card's status property |
| assignedMemberId | TEXT | from the card's Person property |
| assignedMemberName | TEXT | from the card's Person property |
| lastEditedTime | TEXT | Notion's own timestamp |
| lastSyncedAt | TEXT | when this app last pulled the card |

## API

| Method | Route                     | Does                                                          |
| ------ | ------------------------- | ------------------------------------------------------------- |
| POST   | `/api/boards`             | register a Notion database as a trackable board               |
| GET    | `/api/boards`             | list registered boards                                        |
| POST   | `/api/boards/:id/sync`    | pull current cards from Notion into `cards_snapshot` (upsert) |
| GET    | `/api/boards/:id/cards`   | list cards for a board (`?memberId=` optional filter)         |
| GET    | `/api/boards/:id/members` | deduplicated list of members with cards on a board            |

Planned but not yet built:

- `GET /api/cards/:pageId/comments` — raw comments for a card
- `GET /api/cards/:pageId/summary` — lazily-generated AI summary of a card's comments (Gemini)

## Frontend plan

Dashboard groups cards by assigned member, each in a collapsible section (▼/▶ toggle), similar to a grouped Notion board view. A board selector switches between registered Notion databases; a sync button manually triggers a refresh from Notion. Exact per-card fields beyond school name, status, and assignee are still being decided once the layout is visible.

## Setup

1. Create a Notion internal integration at [notion.so/my-integrations](https://notion.so/my-integrations) and share your comms board database with it.
2. In `backend/`, create a `.env` file:
3. Install dependencies and run the server:

```bash
   cd backend
   npm install
   node server.js
```

4. Register your board:

```bash
   curl -X POST http://localhost:4000/api/boards \
     -H "Content-Type: application/json" \
     -d '{"notionDatabaseId": "your_database_id", "name": "Comms Board"}'
```

5. Sync it:

```bash
   curl -X POST http://localhost:4000/api/boards/1/sync
```

6. Fetch cards or members:

```bash
   curl http://localhost:4000/api/boards/1/cards
   curl http://localhost:4000/api/boards/1/members
```

## Status

- [x] Notion integration created and permissioned
- [x] `boards` table + `POST`/`GET /api/boards`
- [x] `cards_snapshot` table
- [x] `POST /api/boards/:id/sync` pulling real data from Notion (upsert verified)
- [x] `GET /api/boards/:id/cards` with member filtering
- [x] `GET /api/boards/:id/members`
- [ ] Frontend scaffolding (Vite + Tailwind)
- [ ] Grouped/collapsible dashboard UI
- [ ] Comments endpoint
- [ ] Gemini-based comment summarization (stretch goal)
