---
name: incident-integrity
description: 'Use when changing incident events, handoffs, scope status, responder permissions, or live communications.'
---
# Incident integrity
1. Use independent identity and server-side role checks. A shared development token is not production authentication.
2. Append corrections; never silently overwrite incident history. Serialize chain writes.
3. Verify full hashes before handoff; use external anchors to detect whole-chain rewrites.
4. Store structured scope, owner, state, and timestamps. Determine risks in code, not model prose.
5. Test unauthorized access, tampering, concurrent writes, and stale scope. Keep communications authenticated and privacy-scoped.