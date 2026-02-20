# Todo

- [x] Map backend winning fulfillment states and guards from `STATE_MACHINES.md`
- [x] Trace winning fulfillment implementation in web (`types`, `services`, `components`, `pages`)
- [x] Compare expected vs actual transitions/guards and capture mismatches
- [x] Run targeted verification checks/tests for touched behavior
- [x] Deliver severity-ranked review findings with file/line references

## Review

- Findings:
- P1: concluded role gating marks any non-owner as "not won" (includes non-participants/unauthenticated and winnings-fetch failures)
- P2: host fulfillment page allows `ended` state despite host actions requiring raffle `fulfilling|completed`
- P3: service docs drift from backend transition guards (`claim-winning`, `confirm-received`)
- Risks/Gaps:
- No automated tests around winning transition guards/UI action gating
- Verification:
- Compared `/src/core/STATE_MACHINES.md` + winnings command guards against `src/services/winning/*` + concluded-flow UI components
- Ran codebase searches for dispute/transition endpoints and fulfillment tests
