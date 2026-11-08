# Safe Signal

A concept for a carrier-side, in-call warning. This prototype plays synthetic calls and offers optional browser speech-to-text. A simple rule baseline checks transcript phrases only; voice characteristics are not assessed.

## Run locally

From this project directory, create the backend environment and install dependencies:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Create `backend/.env` from `backend/config.env.example` using the editor. Enter secrets locally only. Set a long random `RESPONDER_TOKEN`; use it in the command-center password input. Set `DATABASE_URL` to the Tiger Data PostgreSQL URL with TLS required. The backend accepts `postgres://`, `postgresql://`, and `postgresql+psycopg://`, selecting the installed psycopg driver for the first two formats while preserving credentials and connection options. Blank NVIDIA key enables the explicitly labeled rules-only fallback. Never use VITE-prefixed variables for secrets.

Start backend from its directory:

```powershell
cd backend
.venv/Scripts/python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints. API reference: http://127.0.0.1:8000/docs.

The Protection view’s **Try your own message** feature posts to the local `POST /api/score` rule baseline; custom text is not sent to NVIDIA.

## Appearance

Use the **Dark / Light** button in the header to change the theme in either Protection or Command center. The first visit follows the device's color preference; an explicit choice is saved in this browser and applied before the page renders. Only the theme is stored, never the presenter key. If browser storage is blocked, switching still works for the current page and a notice explains that it cannot be saved. The simulated phone and navy hero keep their dark product styling in both themes.

## Transcript detection

The message checker, live microphone transcript, scenario assessments, and investigation evidence use the same backend scorer. It recognizes bounded request patterns, including OTP/six-digit code requests, credentials, gift-card payments, remote access, money transfers, secrecy, and threats. Ordinary mentions of payment services or support software alone do not count as requests.

Protective wording such as "Never share your verification code" is excluded. Negation is scoped so "We never ask for your password, but read out the six digits" still flags the later request. Evidence is quoted directly from the input so the call screen can reveal each warning at the matching point in playback.

Risk thresholds are unchanged: zero distinct categories = **low**, one = **uncertain**, two or more = **high**. Repeating the same warning does not inflate the level. This is an explainable rule baseline, not a fine-tuned model, calibrated probability, or validated fraud detector; unfamiliar paraphrases, reported speech, and complex context can still be misclassified.

Judge-demo examples for **Try your own message**:

| Message | Expected result |
| --- | --- |
| Read out the six digits that just arrived on your phone. | Uncertain: verification-code request |
| Read out the six digits. Keep this between us. | High: code request and secrecy |
| Send $500 in Bitcoin immediately. | High: payment and urgency |
| We will never ask you to buy gift cards or share a code. | Low |
| Enter the six-digit code in the official app yourself. | Low |

These are authored regression examples, not evidence of real-world accuracy. Low risk means no matching rules, not a guarantee of safety.

## Public demo deployment

The application lives at the repository root on `main`. The build installs the backend dependencies, builds the React app, and serves the production frontend and API from one HTTPS service.

For a manually created Render **Web Service**, use these settings:

| Setting | Value |
| --- | --- |
| Branch | `main` |
| Root Directory | *(leave blank)* |
| Runtime | Python 3 |
| Build Command | `pip install -r backend/requirements.txt && npm --prefix frontend ci && npm --prefix frontend run build` |
| Start Command | `cd backend && uvicorn app:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health` |
| Instance Type | Free |

If a build reports that `backend/requirements.txt` is missing, clear any **Root Directory** value in the Render service settings, save the change, then deploy the latest commit.

Alternatively, create a Render **Blueprint** from branch `main`; it uses the root [render.yaml](render.yaml). Editing this file does not update a manually configured service's settings.

Enter `DATABASE_URL` and `NVIDIA_API_KEY` in Render's protected environment-variable setup. Use the Tiger Data PostgreSQL connection string with TLS required. Provider URLs starting with `postgres://` or `postgresql://` are automatically normalized to `postgresql+psycopg://`; existing credentials, TLS settings, and other query parameters are preserved. A Blueprint generates `RESPONDER_TOKEN`; for a manual Web Service, set it to a strong random presenter key yourself. Do not commit these values or send them in chat. After deployment, share the public site URL; give the presenter key only to trusted demo operators.

Synthetic calls, microphone transcription, and rule scoring remain public. Hosted investigation, escalation, and the command center require the presenter key. Hosted investigation is limited to five requests per client IP per ten minutes in one running process. This in-memory limit and shared key are demo safeguards, not production authentication or a durable rate limiter.

Render's free web service can sleep after inactivity and may take about a minute to wake. Do not rely on local files or SQLite for deployed persistence; the demo uses the configured Tiger Data database.

## Live microphone mode

The optional live-microphone mode requires explicit consent. Browser speech recognition transcribes speech; depending on browser settings, its speech service may process microphone audio. Only recognized text is sent to the local `/api/score` endpoint. Scam rules evaluate transcript text only; voice characteristics are not assessed.

The in-call warning displays an approximate lead time based on transcript position and recorded clip duration; it is a playback estimate, not a measured detection benchmark.

## Family-safety actions

The warning offers family code-word guidance and a preview of a trusted-contact alert. Both are UI-only: no contact information is collected and no message is sent.

## Verification

```powershell
backend/.venv/Scripts/python.exe -m pytest backend -q
npm --prefix frontend run build
npm --prefix frontend test
```

## Honest boundaries

- Three authored scenarios, not an evaluation dataset. No accuracy claim is justified yet.
- Browser text-to-speech and the existing synthetic delivery clip are demo playback, not real calls. Optional live transcription uses browser speech recognition, which may process microphone audio through its speech service; only recognized text is sent to local rule scoring. Voice characteristics are not assessed, and the browser has no cellular-call access, real caller-volume control, blocking, or carrier reporting.
- Nemotron chooses allowlisted tools in a bounded multi-step loop. All lookup observations are synthetic and labeled. Real hosted access is unverified until credentials are configured.
- Only selected risk labels and a synthetic title cross the escalation boundary. Cloud investigation and responder sharing require separate consent.
- The shared presenter key restricts hosted demo actions, but is not individual identity, MFA, admin enrollment, or RBAC. Use only synthetic data and trusted presenters.
- Event writes serialize and hash-chain; no editing endpoints exist. Database-level immutability and independent external anchors are still required.
- Scope is presently a text entry; structured assets, owners, status tracking, and deterministic stale/contradiction rules remain work.
- Messages are append-only timeline entries with manual refresh, not yet real-time communications.

See TEAMMATE.md for the remaining work and ownership.