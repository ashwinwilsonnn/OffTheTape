# OFF THE TAPE — production site

Server-rendered volleyball media site. Vanilla Node serverless functions on Vercel, data from Supabase.

## Routes
- `/` home · `/news/:slug` articles (SEO: per-page meta, OG, NewsArticle JSON-LD)
- `/hub/:league` + `/rankings` + `/teams` · `/team/:id` · `/scores` · `/legal/:page`
- `/approve` — PIN-gated approval queue (Option B). Set `APPROVE_PIN` env var.
- `/sitemap.xml` + `/news-sitemap.xml` — generated from the database
- `/api/ticker|articles|polls` JSON · `/api/cron-espn` score poller (daily cron)

## Environment variables (Vercel → Settings → Environment Variables)
- `SUPABASE_SERVICE_ROLE_KEY` — required for cron writes, approvals, newsletter
- `APPROVE_PIN` — your chosen PIN for /approve
- `LAUNCHED` — set to `1` at launch to remove noindex and go crawlable
- `SITE_URL` — canonical origin (defaults to https://off-the-tape.com)

Content never requires a deploy: publishing = flipping `status` in the database.
