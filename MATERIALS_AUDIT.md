# MedHaven Materials Data Integrity Audit Report

**Generated At:** 2026-08-16T18:04:51.504Z
**Total Rows Checked:** 0
**Broken URL Count:** 0
**Tier/Type Inconsistent Count:** 0

## Pattern & Criteria Used for Tier/Type Judgment

- **Valid Format Types:** `pdf`, `video`, `image`, `slideshare`, `doc`, `link`, `office`, `lecture_slide`, `past_question`
- **Valid Content Tiers:** `study`, `recommended`, `recommendation`, `past_question`, `slides`
- **Pattern Inconsistencies Flagged:**
  - Missing or unrecognized format type or tier value.
  - Incompatible combination (e.g. tier `past_question` with type `video` or `slideshare`; tier `slides` with type `video`).
  - Type `slideshare` without a valid supported slide provider URL (`slideshare.net`, `slideserve.com`, `scribd.com`, `slides.com`).
  - Type `link` without a `source_url`.

## Broken-URL Rows

*No broken URLs or missing resource paths found.*

## Tier-Inconsistent Rows

*No tier/type inconsistent rows found.*
