# Jarvis Demo UI

Minimalist Next.js demo UI for the Jarvis AI Productivity Backend. Demonstrates all built features including chat with thinking process, PDF ingestion, FullCalendar schedule, task assignment visualization, proactive workspace, and architecture diagram.

## Features

- **Chat** – Brain dump, plan-day, ingestion routing with thinking process display
- **PDF Drop** – Drag-and-drop or file picker for syllabus/PDF ingestion
- **Schedule** – FullCalendar day/week view with Start Task buttons
- **Task Assignment Viz** – Animated flow: goal → decomposition → solver → calendar
- **Workspace** – RAG chunks, YouTube/articles, practice quiz per task
- **Architecture** – Mermaid diagram of the 9-layer agentic stack
- **Habits** – Add behavioral constraints, see suggested_action

## Demo Mode vs Live Mode

- **Demo Mode** (default): Uses hardcoded mock data. Flawless for screen recording—no API latency, no errors.
- **Live Mode**: Connects to Jarvis-Engine at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

Toggle in the header. For recording, use Demo Mode and hide the toggle in settings if desired.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For Live Mode, ensure Jarvis-Engine is running and set `NEXT_PUBLIC_API_URL` in `.env.local` if different from `http://localhost:8000`.

## Recording Checklist

1. Switch to Demo Mode
2. Verify flows: chat → schedule → Start Task → workspace, PDF drop → ingestion
3. Hide mode toggle in settings for clean recording (or keep subtle)
4. If Live Mode fails during a live demo, switch to Demo Mode and continue
