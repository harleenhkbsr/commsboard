# Comms Board Tracker

A dashboard that connects to a Notion comms board and surfaces cold-calling activity — which schools were contacted, who's been most active, and an AI-generated summary of each school's comment history — without having to scroll through Notion directly.

## Why

The team keeps a Notion database of schools being cold-called. Cards get assigned to a caller, who logs progress in comments over time. This project pulls that data out of Notion into a browsable dashboard, grouped by team member and sorted by recent activity, with AI-generated summaries of each card's comment thread — so getting up to speed on a school takes seconds instead of reading through raw call logs.

## Features

- Register any Notion database as a trackable "board"
- Manually sync live card data from Notion (school name, status, assignee, tag, label, comment activity)
- Dashboard grouped by assigned team member, each in a collapsible section
- Members and their cards sorted by most recent activity — factoring in both Notion property edits _and_ comment timestamps (Notion doesn't roll comments into a card's edit time, so these are tracked and combined separately)
- Color-coded status and tag indicators
- Each card shows its latest raw comment, with timestamp
- On-click AI summarization of a card's full comment thread via the Gemini API, cached until new comments are added

## Tech stack

- **Backend:** Node.js + Express
- **Database:** SQLite via Node's built-in `node:sqlite` module
- **Frontend:** React (Vite) + Tailwind CSS
- **External APIs:** Notion API (data source), Google Gemini API (`gemini-3.6-flash`, comment summarization)

## Project structure

comms-board-tracker/
backend/
server.js → Express app, all routes
db.js → opens comms.db, creates tables
.env → NOTION_TOKEN, NOTION_DATABASE_ID, GEMINI_API_KEY (not committed)
package.json
frontend/
src/
App.jsx → top-level state, fetch orchestration, member/card grouping + sorting
components/
BoardSelector.jsx
MemberGroup.jsx → header row + collapse toggle, renders its CardList
CardList.jsx
Card.jsx → status/tag/label badges, latest comment, AI summary button
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
| status | TEXT | pipeline stage (e.g. "Follow up", "Meeting Scheduled") |
| assignedMemberId | TEXT | from the card's Assign (person) property |
| assignedMemberName | TEXT | from the card's Assign (person) property |
| tag | TEXT | Hot / Mild / Cold |
| label | TEXT | situational note (e.g. "Asked for an email to be sent") |
| lastEditedTime | TEXT | Notion's own property-edit timestamp |
| lastCommentTime | TEXT | timestamp of the most recent comment (tracked separately — Notion doesn't update lastEditedTime for comments) |
| latestCommentText | TEXT | text of the most recent comment |
| lastSyncedAt | TEXT | when this app last pulled the card |

**`comment_summaries`**
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| notionPageId | TEXT | unique |
| commentCount | INTEGER | cache-invalidation key — regenerates only if this changes |
| summary | TEXT | Gemini-generated summary of the full comment thread |
| generatedAt | TEXT | defaults to current timestamp |

## API

| Method | Route                        | Does                                                                                                      |
| ------ | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| POST   | `/api/boards`                | register a Notion database as a trackable board                                                           |
| GET    | `/api/boards`                | list registered boards                                                                                    |
| POST   | `/api/boards/:id/sync`       | pull current cards + comments from Notion into `cards_snapshot` (upsert; removes cards deleted in Notion) |
| GET    | `/api/boards/:id/cards`      | list cards for a board (`?memberId=` optional filter)                                                     |
| GET    | `/api/boards/:id/members`    | deduplicated list of members with cards on a board                                                        |
| GET    | `/api/cards/:pageId/summary` | AI summary of a card's full comment thread, generated on request and cached until comment count changes   |

## Setup

1. Create a Notion internal integration at [notion.so/my-integrations](https://notion.so/my-integrations), enable **Read content** and **Read comments**, and share your comms board database with it (`···` menu → Connections).
2. Get a Gemini API key from [aistudio.google.com](https://aistudio.google.com) (free tier).
3. In `backend/`, create a `.env` file:

NOTION_TOKEN=your_integration_secret
NOTION_DATABASE_ID=your_database_id
GEMINI_API_KEY=your_gemini_key

4. Install dependencies and run the backend:

```bash
   cd backend
   npm install
   node server.js
```

5. In a separate terminal, run the frontend:

```bash
   cd frontend
   npm install
   npm run dev
```

6. Register a board (one-time):

```bash
   curl -X POST http://localhost:4000/api/boards \
     -H "Content-Type: application/json" \
     -d '{"notionDatabaseId": "your_database_id", "name": "Comms Board"}'
```

7. Open the frontend and click **Sync** to pull live data.

## Status

- [x] Full backend: boards, sync (with upsert + stale-card cleanup), cards, members
- [x] Comment tracking: separate timestamp + text, since Notion excludes comments from `lastEditedTime`
- [x] Activity-aware sorting (members and their cards) combining edit and comment recency
- [x] Tag/label/status extraction and color-coded display
- [x] Gemini-powered comment summarization, cached and generated on request
- [x] Frontend: board selector, sync button, collapsible member groups, per-card AI summary
- [ ] Recency filtering on sync (limit to last-edited-in-N-days, for a true "weekly digest" view)
- [ ] Visual redesign (current UI is functional but using default Tailwind styling — in progress)
