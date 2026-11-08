# Safe Signal: AI Scam Call Guard
**HackUTD 2026 · T-Mobile "Safe Signal" Challenge (+ NVIDIA Nemotron track)**

---

## 1. The idea

Our idea for the T-Mobile challenge focuses on what happens after a user answers a spam call.

Within the first 10 seconds of the call, the system checks whether the caller is a human or an AI. If it's an AI, it analyzes patterns in the caller's word choice, tone, and how it responds to the user.

When it detects an AI caller, the phone lowers the caller's volume and alerts the user: *"This call appears to be Scam Likely. Hang up."*

The user can then opt in to a full investigation of the call to verify where it's coming from. Once confirmed, the number is added to the user's Scam Likely list, blocked, and reported automatically.

**Pitch line:** Scam Shield stops scam calls before they ring. We protect you from the ones that get through, while you're still on the call.

---

## 2. How it maps to the judging criteria

| T-Mobile asks for | How we deliver it |
|---|---|
| Creativity | Lowering the caller's volume and warning the user privately is a new kind of in-call protection, not just a banner |
| Impact | Targets AI voice-clone scams, a fast-growing fraud type that slips past network filters |
| Usability | One spoken warning and one decision ("hang up?"); the investigation is optional |
| Security and privacy | On-device analysis, no call recording stored, investigation only with consent |
| Detection quality | Multiple signals fused into one honest confidence score, evaluated on our own synthetic dataset |
| "You create the data" | We generate our own AI and human scam and legitimate calls |

---

## 3. System architecture

```
 Incoming call (answered)
        │
        ▼
┌──────────────────────────┐
│ 1. Audio capture         │  Rolling 2-second chunks, kept in memory only
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ 2a. Voice analysis       │      │ 2b. Speech-to-text       │
│ Synthetic-voice detector │      │ Live transcript          │
│ (tone, prosody, spectrum)│      │                          │
└────────────┬─────────────┘      └────────────┬─────────────┘
             │                                 ▼
             │                    ┌──────────────────────────┐
             │                    │ 2c. Language analysis    │
             │                    │ Nemotron: word patterns, │
             │                    │ scripted replies, asks   │
             │                    └────────────┬─────────────┘
             ▼                                 ▼
┌───────────────────────────────────────────────────────────┐
│ 3. Risk engine: fuses signals into one confidence score    │
└────────────┬──────────────────────────────────────────────┘
             ▼  (score > threshold, within ~10 seconds)
┌──────────────────────────┐
│ 4. Intervention          │  Lower caller volume + private warning
└────────────┬─────────────┘
             ▼  (user opts in)
┌──────────────────────────┐
│ 5. Investigation agent   │  Nemotron calls lookup tools, builds a verdict
└────────────┬─────────────┘
             ▼  (confirmed)
┌──────────────────────────┐
│ 6. Block, flag, report   │  Scam Likely list + block + report
└──────────────────────────┘
```

### Stage 1: Audio capture
- Audio is processed in rolling chunks of about 2 seconds.
- Chunks live in memory only and are discarded after scoring. Nothing is written to disk.
- Hackathon version: a web app plays a pre-recorded call through a phone-style interface, and we analyze that audio stream.

### Stage 2a: Is the caller human or AI? (voice signals)
Signals a synthetic-voice detector looks for:
- **Spectral artifacts:** traces left by voice synthesizers (vocoders), often in high frequencies.
- **Prosody:** pitch and rhythm that are unnaturally even, or emotion that doesn't match the words.
- **Breathing and micro-pauses:** real people breathe, hesitate, and say "um"; many clones don't, or do it on a fixed pattern.
- **Background consistency:** room noise that's perfectly clean or loops.

Implementation: use a pretrained audio anti-spoofing model (open models trained on the ASVspoof benchmark datasets are available on Hugging Face). Run it on each chunk and average the scores over time.

### Stage 2b and 2c: What is the caller saying? (language and behavior signals)
- Live speech-to-text (Whisper or a cloud speech API).
- Nemotron reads the rolling transcript and scores:
  - **Requests:** gift cards, wire transfers, crypto, one-time codes, passwords, remote-access apps
  - **Pressure tactics:** urgency, threats (arrest, account closure), secrecy ("don't tell anyone")
  - **Impersonation:** claims to be a bank, the IRS, T-Mobile, police, or a family member
  - **How it responds to the user:** scripted replies that ignore what the user said, unnaturally fast replies, or the same wording when the user repeats a question. This is your "the way it responds to the caller" signal.

### Stage 3: Risk engine
Combine the signals into one score. Starting point (tune it on your dataset):

```
risk = 0.40 * ai_voice_score
     + 0.35 * scam_language_score
     + 0.15 * response_behavior_score
     + 0.10 * number_reputation_score
```

- **Alert threshold:** risk ≥ 0.70 → step in.
- **Uncertain zone:** 0.45–0.70 → show a subtle "This call may be suspicious" banner without lowering the volume.
- The score updates every chunk, so confidence can keep rising after the first 10 seconds.

> **Security engineer note:** An AI voice alone is not proof of a scam. Pharmacies, clinics, and delivery services use legitimate AI callers. Requiring AI voice **plus** at least one scam-language signal before the full intervention keeps false positives down. Be ready to explain this when judges ask.

### Stage 4: Intervention
- Lower the caller's audio to about 20% volume. In the browser, use the Web Audio API `GainNode` and ramp it down smoothly.
- Play a private warning that only the user hears: *"This call appears to be Scam Likely. Hang up."*
- Show the screen with three buttons: **Hang up**, **Investigate**, **Ignore warning**.
- The caller never hears the warning.

### Stage 5: Investigation agent (opt-in)
A Nemotron agent plans and calls tools in parallel, then explains its verdict in plain language:

| Tool | What it checks | Hackathon version |
|---|---|---|
| STIR/SHAKEN attestation | Did the carrier verify the caller is allowed to use this number? (A = full, B = partial, C = gateway/unknown) | Mock field in the call metadata |
| Number reputation | Recent reports, call volume, how new the number is | Local JSON or SQLite of synthetic reports |
| Identity match | Does the number belong to the organization the caller claimed to be? | Curated JSON of official numbers |
| Call pattern | Is this number calling many people in a short time? | Synthetic call logs |
| Transcript evidence | Exact phrases that triggered the alert | From stage 2c |

**Honest framing:** Caller ID can be spoofed, so we usually can't find a scammer's physical location. "Where is this call coming from" means: is the caller who they claim to be, did the carrier verify the number, and has this number been reported?

Example output:
> **Very likely a scam (91%)**
> - The voice shows signs of being AI-generated
> - The caller asked for a one-time verification code
> - Claimed to be "Chase Fraud Department," but the number doesn't match Chase's official numbers
> - Network verification: C (caller ID could not be verified)

### Stage 6: Block, flag, and report
Once the user confirms:
1. Add the number to the user's **Scam Likely** list.
2. **Block** future calls from it.
3. **Report** it: in a real product, to the carrier's scam reporting (Scam Shield) and the FTC. In the demo, write to a reports table and show a counter.
4. Optional: feed the confirmed report back into the number reputation data, so the next user who gets that call is warned faster.

---

## 4. Threat model

| Threat | Risk | Mitigation |
|---|---|---|
| False positive on a legitimate AI caller | User hangs up on their pharmacy | Require AI voice + scam language; show confidence and reasons; "Ignore warning" option |
| Human scammer (no AI voice) | Missed scam | Language and behavior signals still score the call |
| Caller ID spoofing | Wrong number gets blocked or reported | Use attestation level; never report a number based only on caller ID; human confirms before reporting |
| Attacker tunes a clone to evade detection | Detection weakens over time | Multiple independent signals; retrain on new samples |
| Prompt injection via speech ("ignore your instructions") | Agent manipulated | Treat the transcript as untrusted data; fixed system prompt; agent can only call read-only lookup tools |
| Privacy of call audio | Sensitive data exposed | Analyze in memory, keep no recordings, store only risk scores and the reported number |
| Consent laws for call analysis | Legal risk | On-device analysis, opt-in setting, disclosure tone as in Google's version; note the difference between one-party and two-party consent states |
| Malicious mass reporting | Legitimate numbers blocked | Reports need a confirmed investigation; rate-limit reports per user |

---

## 5. Data plan (T-Mobile requires synthetic data)

Build a small labeled dataset:

| Category | Count | How to make it |
|---|---|---|
| AI voice, scam script | 15–20 | Write scripts, generate voices with ElevenLabs or another text-to-speech tool |
| Human voice, scam script | 10 | Teammates read scam scripts |
| AI voice, legitimate (reminders, deliveries) | 10 | Text-to-speech with normal scripts |
| Human voice, legitimate | 10 | Teammates make normal calls |

- Use Nemotron to generate varied scam scripts: bank fraud, IRS, grandparent emergency, tech support, toll payment.
- Label every clip and keep a JSON manifest.
- Report precision and recall on this set in your demo. Even a small honest evaluation stands out to judges.

---

## 6. Tech stack (suggested)

| Layer | Option |
|---|---|
| Frontend | React or Next.js, phone-style call screen |
| Audio playback and volume lowering | Web Audio API (`AudioContext`, `GainNode`) |
| Backend | Python FastAPI with WebSocket streaming |
| Speech-to-text | Whisper (local) or a cloud speech API |
| Synthetic-voice detection | Pretrained anti-spoofing model from Hugging Face (PyTorch) |
| Language and agent | NVIDIA Nemotron via build.nvidia.com / NIM API, with tool calling |
| Data | SQLite or JSON files for number reputation, official numbers, reports |
| Voice generation (dataset) | ElevenLabs or another TTS |

---

## 7. Skills you need

### Must-have
- **Python:** backend, audio processing, model inference
- **REST and WebSocket APIs:** streaming audio chunks and live scores to the frontend
- **Frontend (React/JS):** phone UI, real-time updates, Web Audio API
- **LLM prompting and tool calling:** structured JSON outputs from Nemotron, defining tools, handling the agent loop
- **Basic audio processing:** sample rates, chunking, converting formats (`librosa`, `pydub`, `ffmpeg`)

### Security-specific knowledge
- **Social engineering patterns:** how vishing (voice phishing) scams are structured
- **Caller ID spoofing and STIR/SHAKEN:** what attestation levels A, B, and C mean
- **Threat modeling:** listing what could go wrong and how you prevent it (section 4)
- **Privacy by design:** data minimization, no stored recordings, consent
- **Prompt injection defense:** treating speech transcripts as untrusted input

### ML and evaluation
- **Using pretrained models:** loading a Hugging Face audio classifier and running inference
- **Evaluation basics:** precision, recall, false positive rate, and picking a threshold
- **Score fusion:** combining several signals into one weighted score

### Nice to have
- Docker, for a clean demo setup
- Figma, for quick UI mockups before coding
- Demo video editing, since a 2-minute demo video was required last year

---

## 8. Team roles (team of 4)

| Role | Owns |
|---|---|
| Audio / ML | Synthetic-voice detector, audio chunking, evaluation numbers |
| Agent / Backend | FastAPI, WebSocket stream, Nemotron prompts and tools, risk engine |
| Frontend / UX | Phone screen, volume lowering, warning flow, investigation result screen |
| Data / Pitch | Synthetic dataset, lookup JSON files, threat model slide, demo script and video |

---

## 9. Build timeline

Confirm the exact submission deadline with the organizers. Last year it was noon Sunday.

| Time | Goal |
|---|---|
| Sat evening | Scripts written, voices generated, repo and API skeleton running |
| Sat night | Speech-to-text + Nemotron scoring working on a recorded clip |
| Early Sun | Synthetic-voice detector plugged in, risk engine, volume lowering + warning |
| Sun morning | Investigation agent + block/report screen, evaluation numbers |
| Final 2 hours | **Feature freeze.** Polish the UI, record the demo video, submit to Devpost |

**Fallback plan:** If the synthetic-voice detector isn't reliable in time, keep it in the pipeline at lower weight and lean on the language and behavior signals. Say so honestly in the demo.

---

## 10. Demo script (about 2 minutes)

1. **Hook (15s):** "AI voice clones made phone scams sound real. Network filters catch most scam calls, but some get through. Here's what happens when one does."
2. **Call 1, AI scam (45s):** The call plays. The live risk meter climbs. Around 10 seconds in, the caller's volume drops and the warning plays. Tap **Investigate** and the agent's checks appear one by one. Verdict: 91%. Tap **Block and report**.
3. **Call 2, legitimate AI reminder (20s):** A pharmacy reminder in an AI voice. The meter stays low because there are no scam signals. "We don't flag AI just for being AI."
4. **Results (20s):** Precision and recall on our synthetic dataset, plus the privacy points: on-device, nothing recorded, opt-in investigation.
5. **Close (20s):** "Safe Signal protects you during the call, investigates only with your permission, and keeps the next person safe by reporting what it finds."

---

## 11. Future work (mention, don't build)

- Network-level integration with real STIR/SHAKEN data and Scam Shield
- On-device models (no cloud calls at all)
- Recovery flow after the call ("I already shared a code") with step-by-step guidance
- A trusted-contact alert for family members
