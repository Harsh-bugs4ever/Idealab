# SwachhFlow

A map-first sanitation operations MVP for Semester V PS 8: observe public-service usage and demonstrate efficient operation. Independent student project; no MBMC affiliation.

## Run locally

Requires Node 22.13+ (Node 24 recommended).

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed by Vinext (normally http://127.0.0.1:5173). Windows PowerShell may require `npm.cmd` because execution policy blocks `npm.ps1`.

```powershell
node node_modules/typescript/bin/tsc --noEmit --incremental false
node --test tests/model.test.mjs
npm.cmd run build
npm.cmd start
```

Stack: React 19, Next.js App Router APIs through Cloudflare Vinext, TypeScript, Tailwind base with authored responsive CSS, MapLibre GL JS, optional Supabase/PostgreSQL. Sites/Vinext builds the same application to Cloudflare Workers. The Sites Vite integration is retained. No image generation or paid service is required.

## Working features

- Interactive map, clusters, marker/list selection, location permission on demand, zoom, map reset, search-this-area, map error state, and equivalent facility list.
- Search and combined locality, priority, operating status, issue category, accessibility, and information-freshness filters.
- Facility drawer with priority reason, cleaning/usage/verification records, water/accessibility status, source links, reports, maintenance tasks, and activity history.
- Aggregate usage entry, observation interval, correction with audit reason, and duplicate-request protection.
- Anonymous local-demo reporting, unique reference, report deep link, unverified initial state, verification/dismissal, and grouped inspection tasks.
- Cleaning, inspection, repair, and replenishment tasks; assignment, start, blocked reason, checklists, completion, and supervisor reopening.
- Only explicitly checked verified issues are resolved by a compatible task. Cleaning cannot resolve a plumbing fault. Inspection alone cannot resolve a repair.
- Completion resets the cleaning baseline but retains historical usage. Map, list, dashboard, and analytics share the same state and reducer.
- Analytics from records: visits by 2-hour interval (IST), facility usage, completion totals, resolution median, overdue work, and observation coverage.
- English/Hindi/Marathi navigation and core action labels. Facility/source data and some operational descriptions remain in English.
- Responsive mobile layout, resizable facility sheet, keyboard focus, modal focus trapping, reduced motion, loading/empty/error states, storage-failure notification, and offline notification.
- Local demo persistence and reset; optional authenticated persistent team demo described below.

## Data provenance

Public OSM snapshot: `public/osm-facilities.json`, retrieved 25 October 2026, OSM base timestamp `2026-10-25T06:26:48Z`.

Query: `[out:json][timeout:20];nwr[amenity=toilets](19.24,72.77,19.33,72.91);out center tags;`

Seven records were returned. The bounding box is a search area, **not** an official municipal boundary. This is not a complete toilet inventory. No source record has been field verified. Geometry centres are identified separately from mapped points. Unnamed facilities retain OSM record IDs; no invented names or addresses are assigned. `wheelchair=limited` stays unknown rather than being promoted to full accessibility. Raw source attributes are retained in the snapshot.

The public-locations API defaults to this dated snapshot for reproducibility and resilience. `/api/facilities?refresh=1` requests fresh Overpass data, subject to source availability and the one-hour in-process cache. All facility current operational/cleaning/water conditions remain unknown. No historical web article is attached as a current alert.

Official context, accessed 25 October 2026:

- https://www.mbmc.gov.in/assets/uploads/latest-952.pdf — community-toilet operation/maintenance EOI, issued 5 September 2024. Context only, not a condition feed.
- https://mbmc.gov.in/en/mbmc/solid-waste — sanitation department material. No location or current cleanliness inferred from general notices.
- https://www.openstreetmap.org/copyright — OSM data © OpenStreetMap contributors, ODbL.

Default map: ordinary on-screen OpenStreetMap raster tiles with attribution and standard browser cache. No tile bulk-download or offline-map functionality. Provider settings can be changed with `MAP_STYLE_URL` or `MAP_TILE_URL` / `MAP_ATTRIBUTION`. Maintain attribution and comply with https://operations.osmfoundation.org/policies/tiles/ . Never put a secret API key in a client-visible map URL. A MapLibre public demo glyph endpoint is used for marker symbols. Google Fonts supplies DM Sans and Noto Sans Devanagari with system fallbacks.

Demo facilities are fictional and coordinates illustrative. All seed conditions and usage are simulated. Demo operations are labelled and are never mixed with public OSM condition records. Local edits live only in the current browser; they are not shared or official complaints.

## Explainable demo policy

Default threshold: 60 visits or 4 hours since recorded cleaning; illustrative, not an official sanitation standard. Supervisor can configure it. Verified water/blocked-fixture issues and overdue tasks are urgent. Reports and breached usage/interval thresholds need attention. Missing usage/cleaning records produce insufficient-data status. Opening status, priority, and verification freshness are separate concepts.

No health, emissions, water-saving, or improvement percentages are fabricated. Historical downtime is shown as unavailable until continuous closure observations exist. Charts count observations at their interval end; they do not estimate visits across hours.

## Optional Supabase team demo

The delivered app works with zero credentials. The local role selector simulates staff and is explicitly **not** authentication. A backend adapter with authenticated staff membership, server-side validation, restricted DB access, and atomic revision checks is included for a persistent team demonstration.

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local`. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. All keys stay server-side. For local dev, export those variables into the server process or launch Node with the env file. For hosted deployments set them as secret runtime variables through Sites.
3. Create a staff account in Supabase Auth through its administrator console. The application does not provide public account registration or password reset.
4. Provision the first supervisor, using that account's Auth UUID:

```powershell
node --env-file=.env.local scripts/provision-workspace.mjs <auth-user-uuid> "Project supervisor"
```

5. Restart the server. Open **Sources & methodology → Team workspace** and sign in. This loads the provisioned shared demo. Changes save only after successful backend confirmation. A cloud connection badge identifies persistence; local demonstration records are preserved separately.
6. Additional staff can be added by an administrator to `sf_memberships` with the same workspace UUID. Roles are `Supervisor` or `Attendant`. Demo attendant display names must match Asha Patil, Rohan More, or Meera Shah for task assignment. Attendants may transition only their own tasks and cannot change policy, create tasks, or reopen completed work. Membership comes from the server, never a client role field.

Database access: anon/authenticated roles have no direct table grants. The server checks the JWT against Supabase Auth and looks up membership before using its private service key. Mutations use Zod validation, the shared reducer, and `WHERE revision = expected_revision` to prevent lost updates. Cookies are HttpOnly, SameSite=Strict, and Secure on HTTPS. POSTs reject cross-origin requests. Sessions expire after at most one hour; reconnect/sign in again. This MVP does not run background refresh or real-time subscriptions; reconnect to fetch other users' changes.

Rate limiting is a bounded in-process safeguard; a public rollout needs durable edge throttling. Anonymous citizen reports are functional in the local demo; public production intake into the team workspace is intentionally not exposed. Real facility onboarding and real-world cleaning policies require an operator's verified inventory. Team data is still an explicit **demo**. No production municipal integration is claimed.

State entities are versioned within a PostgreSQL JSONB workspace document: facilities with source provenance, usage observations, reports, tasks/checklists, inspections/activity, and priority policy. Atomic document revision updates make this small MVP consistent. Split entities into normalized tables for a larger deployment. No photo uploads are included.

## Two-minute guided demo

Use **Run guided demo** in the local workspace (resets local demonstration records):

1. Record 40 visits at Meadow Demo Centre; the 60-visit threshold is crossed.
2. Create the cleaning task.
3. Submit a no-water report at Palm Demo Centre; inspection is created automatically.
4. Assign inspection to Rohan More.
5. Confirm the water issue, complete the inspection checklist, and create a repair task.
6. Assign/start/complete Meadow cleaning with its checklist. Cleaning baseline resets.
7. View analytics: a cleaning completion appears; historical visits remain; the water repair stays open.

Also switch to Public locations to inspect the seven OSM source records and observe that current conditions remain unknown.

## Verification and limits

Meaningful model tests cover thresholds, idempotency, missing records, task transitions/checklists, cleaning history, incompatible repair resolution, corrections, and explicit report resolution. TypeScript and production build checks are run during delivery. HTTP preview checks verify the root and data/config routes.

Browser visual QA could not be completed: the Windows computer-use tool stopped because it could not reliably identify the current browser URL. The layout is implemented for desktop/mobile but has not been visually confirmed in-browser. Supabase end-to-end tests require project credentials and provisioned accounts; none were supplied. Production security assessment and a real sanitation pilot are outside the verified demonstration.
