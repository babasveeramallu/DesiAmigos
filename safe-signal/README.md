# Safe Signal

A concept for a carrier-side, in-call warning. This prototype plays synthetic calls and shows how a private alert would work. Scam phrases are found by simple rules on the transcript. Audio is not analyzed.

## Run locally

From this project directory, create the backend environment and install dependencies:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Create `backend/.env` from `backend/config.env.example` using the editor. Enter secrets locally only. Set a long random `RESPONDER_TOKEN`; use it in the command-center password input. Set `DATABASE_URL` to the Tiger Data PostgreSQL URL with TLS required, using `postgresql+psycopg://` as the scheme. Blank NVIDIA key enables the explicitly labeled rules-only fallback. Never use VITE-prefixed variables for secrets.

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

## Verification

```powershell
backend/.venv/Scripts/python.exe -m pytest backend/test_app.py -q
npm --prefix frontend run build
```

## Honest boundaries

- Three authored scenarios, not an evaluation dataset. No accuracy claim is justified yet.
- Browser text-to-speech is synthetic playback, not audio analysis. No cellular audio capture, volume intervention, blocking, or carrier reporting.
- Nemotron chooses allowlisted tools in a bounded multi-step loop. All lookup observations are synthetic and labeled. Real hosted access is unverified until credentials are configured.
- Only selected risk labels and a synthetic title cross the escalation boundary. Cloud investigation and responder sharing require separate consent.
- Shared responder token is a local development access gate, not individual identity, MFA, admin enrollment, or RBAC. Do not deploy this publicly unchanged.
- Event writes serialize and hash-chain; no editing endpoints exist. Database-level immutability and independent external anchors are still required.
- Scope is presently a text entry; structured assets, owners, status tracking, and deterministic stale/contradiction rules remain work.
- Messages are append-only timeline entries with manual refresh, not yet real-time communications.

See TEAMMATE.md for the remaining work and ownership.