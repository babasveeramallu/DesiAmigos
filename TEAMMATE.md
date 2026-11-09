# Safe Signal handoff

## Working baseline

- React/Vite and FastAPI deploy together from `main`. Follow [README](README.md) for local and Render setup.
- Synthetic call playback, optional browser speech recognition, and typed messages use the same transcript-rule baseline. Scenario results are precomputed, not audio inference.
- The first signal produces a Suspicious caution; two distinct categories produce Scam Likely. Lead time is an estimate for the first caution, not a measured benchmark.
- Light/dark appearance and browser-only demo blocking persist locally. Consent-based reports share only a synthetic title and risk labels.
- Command center opens a keyless, read-only sample timeline and deterministic handoff. Samples never load stored reports or invoke NVIDIA.
- Hosted investigation, report creation, and stored incidents remain presenter-key protected. Consent is separate for NVIDIA and reporting. Keys remain in page memory only.
- Stored incident events are append-only through the API, hash-linked, and manually refreshed. The handoff groups recorded events; it is not an AI summary.

## Demo checklist

1. Open the live site early to allow Render's free service to wake.
2. Play the bank scenario. Explain Suspicious versus Scam Likely and say "playback estimate" when showing timing.
3. Try a new typed message and a benign control. A low result is not proof of safety.
4. Open Command center and explore both sample incidents and sample handoffs without a key.
5. To demonstrate actual stored reports, enter the presenter key privately, give sharing consent, submit, and open the created incident. Never expose the key in screenshots or submission materials.
6. If demonstrating hosted Nemotron, verify a successful tool-backed run beforehand. "Configured" is not "verified"; investigate uses synthetic tools and has a five-per-ten-minute limit per resolved client address.
7. Rehearse microphone mode in Chrome/Edge with venue noise. Keep typed scoring as the fallback. Browser speech services may process audio.

## Remaining work, not implemented claims

- Validate on an independently sourced, permitted dataset with held-out examples; report misses and false positives. Authored regression cases are not accuracy evidence.
- Verify Tiger Data persistence and the configured NVIDIA model through real, authorized runs. SQLite data on Render can disappear on restart.
- Confirm ingress proxy addresses and forwarded-header sanitation before changing trusted-IP settings. Client-IP rate-limit separation on Render is unverified.
- Individual users, roles, MFA, invitations, structured scope/ownership, and live responder messaging still need backend contracts and implementation.
- A keyless hash chain detects some changes but cannot prevent whole-chain rewrites or tail truncation by database administrators. Database write controls and independent external anchors are absent.
- Real cellular interception, carrier blocking/reporting, and trusted-contact notifications require external integrations. Current controls are browser-only or labeled simulations.

## Collaboration and verification

Use feature branches and normal pull requests; do not force-push shared work. Coordinate API changes before changing consumers. Keep secrets in local/server environment variables, never in frontend variables or commits.

Run backend tests, frontend tests, and the production build as described in [README](README.md). Check mobile/desktop layouts, both themes, consent, first-signal caution, high-risk escalation after dismissal, read-only samples, and the separately authenticated report workflow.
