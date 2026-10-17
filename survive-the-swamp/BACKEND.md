# Survive the Swamp: backend (Auth0 + Supabase + Gemini)

These files drop into your existing project at the same paths. Copy them over
the repo root (it only *replaces* `src/app/api/syllabus/route.js` and
`.env.example`; everything else is new).

## 1. Install
```
npm install @auth0/nextjs-auth0 @supabase/supabase-js
```

## 2. Auth0 (dashboard)
1. Applications -> Create Application -> **Regular Web Applications**.
2. Settings:
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   (add your deployed URL to both when you deploy)
3. Copy Domain, Client ID, Client Secret into `.env.local`.
   `AUTH0_DOMAIN` has no `https://`.
4. Generate `AUTH0_SECRET`:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 3. Supabase
1. Create a project.
2. SQL Editor -> paste `supabase/schema.sql` -> Run.
3. Project Settings -> API: copy the Project URL and the **service_role** key
   into `.env.local`. The service_role key is server-only. Never prefix it
   with `NEXT_PUBLIC_`, never commit it.

## 4. Run
Fill `.env.local` using `.env.example`, then restart `npm run dev`.
Tests for the pure logic (dates, tide, validation): `node --test tests/`

## API (all routes require login; otherwise 401 `{ "error": "Sign in required." }`)
| Route | What it does |
|---|---|
| `GET /auth/login`, `/auth/logout` | Auth0 login/logout (mounted by `src/proxy.js`) |
| `POST /api/syllabus` | `{ syllabusText }` -> `{ assignments }` (Gemini; 10/hour/user) |
| `POST /api/assignments` | Save what `/api/syllabus` returned: `{ assignments }` -> 201 |
| `GET /api/assignments` | The user's assignments with their tasks |
| `DELETE /api/assignments/:id` | Delete an assignment and its tasks |
| `PATCH /api/tasks/:id` | `{ completed: bool }` -> `{ task, reward, inventory }` |
| `GET /api/tide` | `{ level 0-100, state, pressure, upcoming[] }` |
| `GET /api/me` | `{ user, inventory: { driftwood, rope, canvas } }` |

`reward` is `"driftwood" | "rope" | "canvas"` the first time a task is
completed and `null` afterwards, so un-checking and re-checking can't farm
resources. `state` is `calm | choppy | storm | sinking`.

## Hooking up the frontend
```jsx
// Login button
<a href="/auth/login">Log in</a>   // use <a>, not next/link

// After /api/syllabus succeeds in syllabus-form.js:
const saved = await fetch("/api/assignments", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ assignments: result.assignments }),
}).then((r) => r.json());
// saved.assignments[i].tasks[j].id is what you PATCH when a box is checked:
await fetch(`/api/tasks/${task.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ completed: true }),
});
```
Heads up: saved assignments have `dueDate` (`"YYYY-MM-DD"` or `null`) and
`dueDateRaw` (the syllabus's own wording). Show `dueDateRaw ?? "Not specified"`.
Assignments with a null `dueDate` are saved but don't count toward the tide.

## Design notes
- Every query is filtered by the Auth0 `sub` in `src/lib/server/store.js`
  (the service-role key bypasses row-level security). Add new queries there.
- RLS is on with no policies, so the public anon key can read nothing.
- All DB code is in `store.js` + `supabase.js`, so the data layer can be
  swapped without touching the routes.
- The rate limiter is in-memory (per server instance). Fine for a demo.
