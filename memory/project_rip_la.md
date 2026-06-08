---
name: project-rip-la
description: RIP Los Angeles Astro blog — Sanity-to-AstroWind migration status, deploy target, and next steps
metadata:
  type: project
---

Sanity.io → AstroWind static site migration for riplosangeles.com (Nathan Marsak's LA demolition blog). 77 posts, 717 WebP images, all local. Migration complete.

**Why:** Replace Sanity dependency with a fully static, self-contained Astro site.

**Stack:** Astro v6 · Tailwind CSS v4 · TypeScript · MDX · Sharp · Node >= 22.12.0 (use nvm 24)

**Deploy target:** Vercel — project already connected to GitHub repo `git@github.com:historyblogs/stablo-blog-please-work-studio-integrate.git`

**How to apply:** When working on this project, Vercel auto-deploys on push to main. Use SSH for git remote.

## Current state (2026-06-08)

- Site is ready to go live — initial git push to GitHub pending
- URL structure: posts at `/post/[slug]` — matches live Sanity site exactly, no redirects needed
- Logo: custom tombstone SVG with granite texture, curved "DEMO" text, "NOTICE", "RIP"
- LD-JSON: BlogPosting on posts, Person on /about, WebSite on homepage
- All links: dark red (#8b1a1a), bold, no underline (global CSS rule)
- isr-test.md post deleted before launch

## Next steps after launch

1. **Sitepins CMS** (https://sitepins.com/) — connect GitHub repo for visual GUI editing
   - Sitepins supports Astro natively, reads markdown/YAML frontmatter
   - Nathan can edit/write posts visually without touching code
   - Each save commits to GitHub → Vercel auto-deploys
   - Will need schema config for post frontmatter fields (title, publishDate, image, tags, etc.)

2. Map page (`/map`) — interactive map of 68 geocoded demolition sites
3. Location display on SinglePost.astro
