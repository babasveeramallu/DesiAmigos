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

Use the **Dark / Light** button in the header to change the theme in either Protection or Command center. The first visit follows the device's color preference; an explicit choice is saved in this browser and applied before the page renders. The theme and demo block list are stored, never the presenter key. If browser storage is blocked, switching still works for the current page and a notice explains that it cannot be saved. The simulated phone and navy hero keep their dark product styling in both themes.

## Blocking and reporting demo calls

- **Block demo caller** stops current scenario playback and prevents Answer/Replay for that caller. The block list survives reloads in this browser when storage is available. **Unblock demo caller** restores playback; other scenarios remain independent. Storage failures are shown beside the controls.
- **Report this call** moves to the report consent section. Enter the presenter key, allow sharing the selected scenario's title and risk labels, then choose **Submit report**. This uses the existing authenticated `/api/escalate` endpoint, without sending the transcript or caller number. NVIDIA consent is separate and not required.
- Confirmation and errors appear beside the submission button. **Open reported incident** selects that incident in Command center. An in-progress or successful submission cannot be submitted again from the same report form; changing scenarios resets consent.

These are in-app demo actions: no cellular calls are blocked and no carrier, police, or external agency is contacted. Live microphone input cannot identify a caller and is not included in the demo report. Hosted reports use the configured database; SQLite data can be lost when Render restarts or redeploys.

## Transcript detection

The message checker, live microphone transcript, scenario assessments, and investigation evidence use the same backend scorer. It recognizes bounded request patterns, including OTP/six-digit code requests, credentials, gift-card payments, remote access, money transfers, secrecy, and threats. Ordinary mentions of payment services or support software alone do not count as requests.

Coverage also includes verify/confirm passcode requests, branded gift-card payment or code requests, requests to connect to a PC, bail pressure, family-directed secrecy, and Social Security suspension threats. Explicit self-entry in an official app/site is excluded from verify/confirm-code rules. These contextual rules still cannot reliably distinguish every legitimate request or reported scam story.

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

Synthetic calls, microphone transcription, rule scoring, and the read-only Command center demo remain public. Hosted investigation, report submission, and stored incident APIs still require the presenter key. Hosted investigation is limited to five requests per resolved client address per ten minutes in one running process. This in-memory limit and shared key are demo safeguards, not production authentication or a durable rate limiter.

Uvicorn already enables proxy-header processing, but only trusts configured proxy addresses (`FORWARDED_ALLOW_IPS`, otherwise the server's loopback default). The deployed proxy chain and client-IP separation have not been verified. Do not blindly set `--forwarded-allow-ips='*'`: this trusts every sender and can allow spoofed client IPs if ingress does not sanitize headers. Configure actual trusted proxy addresses only after confirming the service topology; until then visitors may share a rate-limit bucket. Changing `render.yaml` does not change a manual Render service's settings.

Render's free web service can sleep after inactivity and may take about a minute to wake. Do not rely on local files or SQLite for deployed persistence; Tiger Data is used only when its database URL is configured successfully.

## Keyless judge demo

Open **Command center** to see two read-only, synthetic sample incidents and **Preview sample handoff**. No key, database access, or NVIDIA request is needed. The sample timeline and handoff are authored fixtures, not stored reports or live integrity verification. They remain separate even after a presenter connects to real stored incidents.

Choose **Stored reports (key required)** for the authenticated workspace. Enter the key once per page session; it is shared with Protection in memory, never saved to browser storage. Successful reporting opens the stored incident directly, not the sample view. This does not remove authentication from any endpoint.

## Live microphone mode

The optional live-microphone mode requires explicit consent. Browser speech recognition transcribes speech; depending on browser settings, its speech service may process microphone audio. Only recognized text is sent to the local `/api/score` endpoint. Scam rules evaluate transcript text only; voice characteristics are not assessed.

The first category shows a **Suspicious** caution; two categories escalate to **Scam Likely**, including when the first caution was dismissed. Recording-volume reduction still occurs only at the high threshold. The timing readout refers to the **first caution**, based on transcript position and recorded duration (or estimated speech duration), not measured detection latency. A first signal can be the sensitive request itself, so an early warning is not guaranteed. Scenario evidence is precomputed and progressively revealed; microphone text is scored as it arrives.

Rehearse microphone mode in the actual room using Chrome or Edge. If permissions, noise, or speech-service access fail, use **Try your own message**; typed input uses the same scorer. Open the Render site before presenting to allow a sleeping service to wake. The keyless sample handoff consumes no investigation quota.

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
- Browser text-to-speech and the existing synthetic delivery clip are demo playback, not real calls. Optional live transcription uses browser speech recognition, which may process microphone audio through its speech service; only recognized text is sent to local rule scoring. Voice characteristics are not assessed, and the browser has no cellular-call access, real caller-volume control, cellular blocking, or carrier reporting.
- Nemotron chooses allowlisted tools in a bounded multi-step loop. All lookup observations are synthetic and labeled. Real hosted access is unverified until credentials are configured.
- Only selected risk labels and a synthetic title cross the escalation boundary. Cloud investigation and responder sharing require separate consent.
- The shared presenter key restricts hosted demo actions, but is not individual identity, MFA, admin enrollment, or RBAC. Use only synthetic data and trusted presenters.
- Event writes serialize and hash-chain; no editing endpoints exist. Database-level immutability and independent external anchors are still required.
- Scope is presently a text entry; structured assets, owners, status tracking, and deterministic stale/contradiction rules remain work.
- Messages are append-only timeline entries with manual refresh, not yet real-time communications.

See TEAMMATE.md for the remaining work and ownership.