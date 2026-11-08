# Call audio clips

Recorded audio for the synthetic call scenarios. Every clip must be
team-created or licensed, and must read the exact synthetic script shown in the
app. No real callers, customers, or phone numbers.

## Adding a clip

1. Put the file in this folder, named after the scenario id: `bank.m4a`,
   `delivery.m4a` or `support.m4a` (.mp3 also works).
2. Add an entry to `clips.json`:

```json
{
  "bank": {
    "file": "bank.m4a",
    "provenance": "Recorded by a DesiAmigos team member reading the synthetic script, November 2026."
  }
}
```

The app shows the provenance text under the call. If a clip is missing or
cannot play, the app falls back to browser speech and says so on screen.

## Transcripts

The transcript for each clip is the scenario script served by the back end at
`GET /api/scenarios`. Read it word for word so the live transcript stays in sync.
