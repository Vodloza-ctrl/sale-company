# Sale Company Starter

Cloudflare-first, Zvakho-style multi-tenant commerce starter for Zimbabwean solo operators and SMEs.

## What is included

- Mobile-first public landing page
- Universal storefront: booking, store, menu and catalogue modes
- Tenant dashboard mockup: items, bookings, orders, reviews, payouts, settings
- Platform admin mockup
- Cloudflare Worker API starter
- D1 schema for tenants, users, items, orders, bookings, reviews, payouts, notifications and audit logs
- R2-ready asset strategy
- Supabase Auth-ready login direction
- WhatsApp-first CTAs
- Safety and compliance notes

## Architecture

Frontend uses static HTML/CSS/JS. It may know `SUPABASE_URL` and `SUPABASE_ANON_KEY` only.

Secrets stay inside the Worker:

- Supabase service role key
- Paynow keys
- Email API keys
- R2 credentials
- D1 write logic
- Admin logic

## Payment modes

Each tenant supports:

- `sale_unified` — Sale Company managed payments and payouts
- `tenant_own_paynow` — merchant-owned payment integration
- `manual` — WhatsApp/manual confirmation

The customer experience stays unified. The Worker decides routing.

## Data protection posture

This starter follows a lean compliance posture:

- Collect minimum customer data
- Avoid national IDs, biometrics and unnecessary sensitive data
- Tenant isolation through `tenant_id`
- Audit important actions
- Keep payout and payment changes logged
- Use R2 for images; never store permanent upload secrets in frontend
- Prepare for privacy policy, deletion requests and breach procedures

## Deploy static frontend

Upload `/public` to Cloudflare Pages.

## Deploy Worker

```bash
cd sale-company-starter
wrangler d1 create sale-company-db
# paste database_id into wrangler.toml
wrangler d1 execute sale-company-db --file=database/schema.sql
wrangler d1 execute sale-company-db --file=database/seed.sql
wrangler deploy
```

## R2 asset folders

```txt
/tenants/{tenant_id}/branding/logo.webp
/tenants/{tenant_id}/banners/hero.webp
/tenants/{tenant_id}/products/{item_id}.webp
/tenants/{tenant_id}/services/{item_id}.webp
```

## Next build steps

1. Replace config values in `public/assets/js/config.js`.
2. Add real Supabase login in `login.html`.
3. Implement JWT verification in Worker.
4. Add tenant role checks before all dashboard actions.
5. Add Paynow payment creation and polling route.
6. Add R2 signed upload route or Worker-mediated upload route.
7. Add Cloudflare Cron route for booking reminders.
