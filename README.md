# ProjectMentor AI — Frontend

Frontend starter for the Infosys **AI Academic Project Mentor** team project.

## Current scope (Milestone 2)

- **Home:** a short welcome card when signed out, and a dashboard (profile summary, recent projects) when signed in
- **Accounts:** server-backed registration, sign-in, and sign-out. Password reset is disabled until verified recovery is available. Each account has its own profile and projects.
- **Student onboarding (Module 1):** profile creation, skill self-ratings, a required skill quiz, and a readiness assessment with strengths and growth areas. Edit profile re-tests only changed skills.
- **Project idea submission:** validated form (title, description, domain, duration) that triggers a functional multi-agent analysis pipeline.
- **Milestone 2 analysis:** four specialist agents run as separate validated steps: feasibility → scope and technology → planning → risk. Each step is persisted and visible while it runs, supports one retry, and can be cancelled.
- **Backend storage and accounts:** Node API with SQLite persistence, server-side scrypt password hashes, signed expiring sessions, login throttling, and per-user profile/project/run access checks.
- **Project analysis dashboard:** completed agent outputs are stored and displayed in the project detail view.
- **Validation:** the engine includes a test suite covering the five required sample project scenarios.
- "My projects" list
- Typed data models, an agent registry, local demo storage, and an authenticated server API

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the seven modules and their milestone status, the research basis, agent roles, data models and the proposed API contract.

**Demo mode:** leave `VITE_API_BASE_URL` blank to use deterministic project-specific analysis and browser storage.

**Live mode:** configure `LLM_API_KEY` in the backend `.env`. The key stays in the Node process and is never sent to or bundled into the frontend. Live mode requires the backend and uses SQLite for accounts, profiles, projects, and pipeline runs.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- Motion for React
- Lucide React icons
- React Router installed for future routes

## Run locally

Requires Node.js 22.13+ (uses the built-in SQLite module).

```bash
npm install
npm run dev
```

### Run with the authenticated backend and OpenAI

1. Copy `.env.example` to `.env` in the project root. The backend also reads `server/.env` for compatibility with setups that created the file from inside the `server` folder; values in `server/.env` take precedence if both files define the same setting.
2. Set `JWT_SECRET` to a random secret and `LLM_API_KEY` to your OpenAI API key in `.env`. Never put either value in a `VITE_` variable or share it in chat.
3. Leave `VITE_API_BASE_URL=http://127.0.0.1:3000`; it switches account and project data to the server. The SQLite database lives at `server/data/projectmentor.sqlite`, resolved from the project folder regardless of which terminal folder starts the server. The API prints the full database path at startup.
4. Open two terminals in the project folder:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

5. Open the Vite URL, register/sign in, complete your profile, and submit an idea. The project page polls SQLite-backed run state and displays each agent step. Failed runs can be retried; active runs can be cancelled.

Check backend readiness at `http://127.0.0.1:3000/health`. It reports whether a key is configured; it does not verify the key or make a billable request.

Each completed live report makes four OpenAI requests, one per agent. Each agent retries once after a failure, so a run can make up to eight requests. Responses are capped at 1,600 tokens per attempt. API usage may incur charges; monitor your OpenAI API billing and use synthetic student data for demos. The provider receives project details and relevant student context (skills, course/year, experience, available hours, assessment), but not account name or email.

### Security and known limitations

- The API binds to `127.0.0.1`; it is a classroom/demo server, not ready for public deployment.
- Password reset is disabled until a verified email recovery flow exists.
- Sessions are bearer tokens held by the frontend in local storage; use HTTPS and secure, httpOnly cookies before production deployment.
- SQLite is appropriate for a single-machine demo. Use a managed database, migrations, backups, and a durable job queue before multi-user hosting.
- The server enforces record ownership and login throttling, but needs additional production controls such as CSRF protection, audit logging, secret rotation, and deployment-level rate limits.

See [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for the presentation flow and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for agent and data-flow details.

Build check:

```bash
npm run build
```

## Git collaboration

1. Create a **public** repository on GitHub named `ai-academic-project-mentor-frontend`.
2. Do **not** initialize the GitHub repo with another README if you are pushing this starter as-is.
3. Extract this project folder, open a terminal inside it, then run:

```bash
git init
git add .
git commit -m "feat: add Milestone 1 frontend starter"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ai-academic-project-mentor-frontend.git
git push -u origin main
```

4. Share the repository link with the team. For the public repo, anyone can view and clone it; to push directly, teammates need write access. Add teammates in **Settings → Collaborators** or use pull requests from their own forks.
5. Agree on branch names and avoid everyone editing the same files at once. Suggested branches: `feat/onboarding`, `feat/project-submission`, `feat/api-integration`.

## Suggested team split

- Frontend owner: landing page, shared design system, integration coordination
- Teammate: onboarding and skill assessment improvements
- Teammate: project idea submission and API integration
- Teammate: AI/backend endpoints and OpenAPI contract
- Teammate: database/auth or testing/documentation (confirm the real team allocation together)

## Integration checklist

- [ ] Share `docs/ARCHITECTURE.md` §4 with the backend team and reconcile it with their OpenAPI/Swagger document
- [ ] Confirm API base URL, authentication, request/response schemas, and error formats
- [ ] Add `VITE_API_BASE_URL` to `.env.local` (never commit secrets)
- [x] API service layer (`src/services/api.ts`). Pages already call it.
- [x] Loading, success, empty, and error states
- [ ] Test student and faculty access separately if role-based authentication is required

## UI library policy

This starter uses a custom design built on React, Tailwind CSS, Motion, and Lucide. Before copying in components from shadcn/ui, Aceternity UI, Magic UI, Kokonut UI, React Bits, or other repositories, verify current framework compatibility, dependencies, component-specific licensing, and attribution requirements.

## Security

- Never commit API keys, tokens, passwords, private `.env` files, or real student data.
- `.env*` files are ignored by Git except the tracked `.env.example`; it contains configuration examples and no key.
- A public repository makes its source code visible to everyone. Keep secrets and sensitive information out of it.
- The LLM proxy binds to `127.0.0.1` and is intended for local demos. Do not expose it publicly without adding authentication, rate limiting, abuse controls, and production-grade data handling.
