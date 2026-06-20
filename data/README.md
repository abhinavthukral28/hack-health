# Data provenance

All data in this repo is **synthetic or public**. No real patient information.

| Fixture | Source | Notes |
|---|---|---|
| `src/fixtures/messages.ts` | Shaped from **MTSamples** (public medical transcriptions) | ~11 curated synthetic inbox messages. Hand-edited; not verbatim PHI. |
| `src/fixtures/patient.ts` | One **Synthea** FHIR R4 synthetic patient | Normalized to a fixture; trimmed raw FHIR kept for the evidence panel. |

Raw downloads (if any) live in `data/raw/` and are gitignored. Only curated fixtures are committed.
