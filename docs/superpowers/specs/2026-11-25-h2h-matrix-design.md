# Career head-to-head matrix

**Status:** Approved (home Managers tab, compute on request)

## Intent

Show all-time W–L–T between every pair of managers on the home Managers tab, using matchups already in Turso. Trash-talk surface, not a new data pipeline.

## Goals

- Career record, including playoffs
- Same managers and order as All-Time Standings (win% desc, then wins)
- Cell is the **row** manager’s record vs the **column** manager (`8–3`, ties as `8–3–1`)
- Diagonal and never-played cells are empty
- Headers link to manager profiles
- Phone: horizontal scroll, sticky name column

## Non-goals

- Season filter, playoff split, points-for in the cell
- Precomputed table / cron
- Manager-profile one-row view (later)

## Anti-goals

- Treating 0–0 the same as never played
- Counting unfinished weeks (no winner and not a tie)

## Approach

Compute on `GET /api/h2h` from `matchups` → `teams.managerId`. Pure aggregator in `lib/h2h.ts`. No new schema.

## Builder calls

- Color: emerald if row is ahead, red if behind, zinc if tied
- Skip matchups whose managers are not in the rankings set
- Cache like rankings (`revalidate` 300)
