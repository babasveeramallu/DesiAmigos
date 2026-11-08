# Two-person handoff

## Current baseline

React/Vite frontend, FastAPI backend, PostgreSQL/Tiger Data adapter with local SQLite fallback, consent-gated synthetic investigation, optional hosted Nemotron tool loop, responder-token gate, tamper-evident event timeline, and deterministic cited handoff template.

## Person 1: backend / security / AI

Own `backend/` and integration configuration. Do not ask the teammate to share secrets through chat.

1. Configure NVIDIA and Tiger Data locally; verify one real tool-call investigation and database persistence. Never display model reasoning traces.
2. Replace shared-token access with individual users, hashed passwords, sessions, admin invitations, server-side roles, CSRF protection, and MFA if feasible. Independent credentials only: no compromised corporate SSO.
3. Add structured scope assets with states, owners, data categories, timestamps, and deterministic stale/open-question rules. Publish schemas before frontend integration.
4. Add DB update/delete prevention plus external full-hash anchors. Hashes alone cannot prevent a whole-chain rewrite.
5. Add authenticated SSE or WebSocket updates for event messages. Add body limits, escalation throttling, audit logging, and HTTPS deployment hardening.
6. Extend tests for concurrent writes, role enforcement, malformed/injected model outputs, and fallback behavior.

## Person 2: frontend / dataset / demo

Own `frontend/`, synthetic evaluation assets, and demo narrative. You can start immediately without NVIDIA credentials.

### Start here

```powershell
git clone https://github.com/babasveeramallu/DesiAmigos.git
cd DesiAmigos/safe-signal/frontend
npm ci
npm run dev
```

Run your own local backend using the README instructions. Vite proxies `/api` to `http://127.0.0.1:8000`; that address refers to YOUR computer, not your teammate's. No NVIDIA key is needed for the labeled rules-only mode. Create your own backend `.env` and responder token. Never commit it or put credentials in frontend environment variables.

### Frontend priority order

1. Replace browser speech synthesis with licensed or team-created synthetic audio clips in `frontend/public/audio/`. Include transcripts and provenance. Preserve play/stop controls and handle playback errors. Do not claim audio analysis until a backend audio model is implemented.
2. Render Nemotron Markdown safely using a maintained renderer such as `react-markdown`, with raw HTML disabled. Replace raw lookup JSON with labeled evidence rows; keep synthetic-source labels visible.
3. Show investigation loading, timeout/fallback, and success states. After successful investigation update the session status; do not imply configured access has already been verified on initial load.
4. Preserve two independent consent checkboxes. Never automatically escalate or share complete transcripts. Reset results and consent when switching scenarios.
5. Build scope/status and admin screens only against agreed backend contracts. These APIs do not exist yet: mock fixtures must be visibly labeled and must not be presented as working security features.
6. Check 390px mobile and 1440px desktop layouts, keyboard focus, readable long verdicts, errors, and empty incident lists. Run `npm run build` before handing back changes.

### Files and acceptance

- Main interface: `frontend/src.jsx`; styles: `frontend/style.css`; proxy: `frontend/vite.config.js`.
- Do not edit `backend/` or change API payloads without coordinating with person 1.
- Deliver: realistic synthetic playback, safe readable verdict rendering, mobile screenshots, passing production build, and a short list of remaining limitations.
- For collaboration, create your own frontend branch locally and open a pull request. Never force-push shared history.

1. Run the UI against the backend and exercise consent, investigation, escalation, responder updates, and handoffs. Use the local responder token supplied securely by person 1.
2. Build structured scope table and owner/status controls once person 1 publishes the API schema. Add administrative enrollment UI only after backend permissions exist.
3. Connect live event updates after SSE/WebSocket contract is ready; preserve scroll position and show connection state.
4. Create a labeled synthetic dataset across impersonation, code theft, remote access, payments, and legitimate automated/human messages. Separate development and held-out evaluation examples. Include benign mentions of suspicious terms and adversarial instructions. Do not use real customer data.
5. Report precision, recall, false-positive rate, sample count, and failure examples. Current rule baseline is deliberately narrow and must not be marketed as validated detection.
6. Record a two-minute demo: scam investigation -> consent/redacted escalation -> responder scope/message -> cited handoff; then show a legitimate scenario and limitations.

## Stable API contract

Public: `GET /api/health`, `GET /api/scenarios`; `POST /api/investigate` and `POST /api/escalate` accept `{scenario_id, consent}`. Investigation sends the synthetic transcript to NVIDIA only after consent; escalation shares title/risk labels only.

Responder: send `Authorization: Bearer <local token>` to `GET /api/incidents`, `POST /api/incidents/{id}/events` with `{body, kind}`, and `GET /api/incidents/{id}/brief`. Kinds: action, finding, question, decision, message, scope, ack.

## Ten-hour priority

First secure individual access/admin enrollment, structured scope, and live communications: these are required challenge components missing from the scaffold. Next validate Nemotron/Tiger Data and held-out detection. Final two hours: feature freeze, mobile checks, threat-model notes, demo and submission. Skip training an audio model and adding a second LLM/provider.

## Avoid conflicts

Person 2 changes frontend and dataset files; person 1 changes backend. Agree on new API schemas before changing consumers. Commit only your owned changes on your team's chosen branches; no credentials in commits. Confirm organizers permit authored synthetic resources in place of unavailable T-Mobile materials.