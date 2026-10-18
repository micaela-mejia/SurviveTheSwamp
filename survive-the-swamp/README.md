#  Survive the Swamp

## Local development

From this directory, install dependencies and start the Next.js development server:

```bash
npm install
npm run dev
```

For Gemini syllabus breakdowns, copy `.env.example` to `.env.local` and set
`GEMINI_API_KEY` to your Gemini API key. Restart the development server after
changing environment variables. Keep `.env.local` private; do not commit API
keys or expose them through `NEXT_PUBLIC_` variables.

Syllabus text is sent to Gemini by server-side code, so the API key is not sent
to the browser. Syllabus analysis requires signing in and is limited to 10
analyses per user per hour. Generated assignments and checklist completion are
saved to Supabase for the signed-in user, so they remain available after
refreshing or signing out and back in. Analyzing another syllabus adds its
assignments to the existing saved plan.


## The Problem
Exam seasons and overlapping deadlines leave college students feeling swamped. Task managers feel like flat, stressful lists that add to the anxiety.

## Our Solution
Survive the Swamp is an AI-powered, gamified task rescue app. Your semester workload becomes a raft floating on a rising swamp tide. Upload your syllabi, and AI breaks assignments into small tasks. Finishing them earns materials that repair and upgrade your raft.

## Features
- AI syllabus and assignment ingestion
- "Swamp Tide" workload engine (water rises as deadlines approach)
- Task rescue: big assignments broken into 15-20 minute subtasks
- Survival crafting and rewards (driftwood, rope, canvas)

## Tech Stack
- Next.js, React, Tailwind CSS
- Auth0 (login)
- Supabase (database)
- Gemini API (syllabus parsing and task breakdown)

## Team
- Micaela Mejia
- Abril Rodriguez
- Giselle Iskandarani
- Anjana Andapally