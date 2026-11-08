# Project Rules

- The static landing page build copies `index.html` and `assets/` into `dist/` because deployments serve only that directory.
- The dashboard remains a static `/admin/` page that uses database RLS and the authenticated browser client for owner-only order management, avoiding a frontend rewrite of the existing landing page.
- Visitor tracking records one anonymous row per browser session and only exposes aggregate counts to the owner dashboard, protecting visitor privacy.