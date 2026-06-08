# START HERE — RIP Los Angeles Astro Blog

## What this is

Nathan Marsak's *RIP Los Angeles* blog (riplosangeles.com) — documenting demolished LA buildings — migrated from Sanity.io to a fully static Astro site using the AstroWind template. No more Sanity dependency; everything is local files.

**Stack:** Astro v6 · Tailwind CSS v4 · TypeScript · MDX · Sharp  
**Run dev:** `npm run dev` → localhost:4321  
**Build:** `npm run build`

---

## Where things live

| What | Path |
|------|------|
| Blog posts (77 total) | `src/data/post/*.md` |
| Post images (717, all WebP) | `src/assets/images/blog/` |
| Location collection (64 entries) | `src/content/locations/*.md` |
| Content schema | `src/content.config.ts` |
| Site config | `src/config.yaml` |
| Tailwind / theme | `src/assets/styles/tailwind.css` |
| Custom colors/fonts | `src/components/CustomStyles.astro` |

---

## Migration history (what's been done)

All work happened in roughly this order:

1. **`migrate.py`** — Pulled 77 posts + 717 images from Sanity API → local markdown + WebP
2. **`rename-images.py`** — Normalized image filenames
3. **`convert-to-webp.mjs` / `reoptimize-webp.mjs`** — Converted/optimized all images to WebP
4. **`add-alt-text.py`** — Injected alt text into image markdown
5. **`insert-excerpts.py`** — Generated excerpts for posts missing them
6. **`geocode-posts.py`** — Geocoded all address-based post slugs via Nominatim (OSM); inserted `location:` blocks (address + lat/lng) into post frontmatter
7. **`geocode-remaining.py`** — Second-pass for ~10 posts Nominatim couldn't resolve; used simplified queries + hardcoded fallback coords
8. **`migrate-locations.py`** *(most recent, May 27)* — Extracted embedded location objects into a proper Astro content collection (`src/content/locations/`), rewrote post frontmatter to use `location: slug` references

---

## Current state of the location system

- **68 of 77 posts** have a `location:` field pointing to a slug in `src/content/locations/`
- **64 unique location files** exist in `src/content/locations/`, each with `title`, `address`, `lat`, `lng`
- **9 posts have no location** — these are editorial/non-place posts (greetings, density essays, anniversary posts):
  - `greetings.md`, `a-word-or-two-on-density.md`, `and-we-re-back.md`, `isr-test.md`, `on-another-note.md`, `the-first-new-post-in-a-very-long-time.md`, `the-lost-art-deco-of-baldwin-hills.md`, `thirty-posts-now-what.md`, `thirty-posts-in-thirty-days.md`
- Schema in `src/content.config.ts`: `location: reference('locations').optional()` — fully wired up

---

## What's next (natural continuation)

The location data is clean and in the schema. The obvious next steps are:

1. **Map page** — an interactive map (`/map`) showing all 68 geocoded demolition sites (Leaflet or Mapbox)
2. **Location display on post pages** — show address + map pin on `SinglePost.astro`
3. **Location index page** — browse posts by neighborhood/address
4. **Build verification** — run `npm run build` to confirm no schema errors after the locations migration

---

## Key scripts (don't re-run unless needed)

- `migrate.py` — re-syncs from Sanity (has read-only token embedded; Sanity project `1eqp3hod`)
- `geocode-posts.py` / `geocode-remaining.py` — re-geocodes; Nominatim rate-limited to 1 req/sec
- `migrate-locations.py` — re-extracts embedded location blocks → collection files (safe to re-run)
