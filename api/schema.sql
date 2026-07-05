-- sale.co.zw — Canonical D1 Schema
-- Run this once against your D1 database:
--   wrangler d1 execute sale-cozw-db --file=api/schema.sql
--
-- All tables use IF NOT EXISTS so it's safe to re-run.

PRAGMA journal_mode=WAL;

-- ── Identity ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS owners (
  id         TEXT PRIMARY KEY,          -- usr_<hex>
  phone      TEXT NOT NULL UNIQUE,      -- normalised E.164 without + e.g. 263772123456
  name       TEXT,
  email      TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id          TEXT PRIMARY KEY,         -- otp_<hex>
  phone       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,            -- HMAC-SHA256(phone:code) — never plaintext
  channel     TEXT NOT NULL DEFAULT 'whatsapp',
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,          -- 48-byte hex random
  owner_id   TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner_id);

-- ── Sites ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id                   TEXT PRIMARY KEY,   -- site_<hex>
  owner_id             TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  site_name            TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft',
    -- draft | pending_payment | published | grace | suspended
  plan                 TEXT NOT NULL DEFAULT 'free',
    -- free | starter | business | mogul
  draft_subdomain      TEXT UNIQUE,        -- slug.sale.co.zw
  custom_domain        TEXT UNIQUE,        -- e.g. myshop.com (business/mogul only)
  custom_domain_status TEXT DEFAULT 'none',
    -- none | pending | verifying | active | failed
  whatsapp_mode        TEXT NOT NULL DEFAULT 'shared',
    -- shared: orders route through the central Sale Company WhatsApp chatbot number
    -- dedicated: tenant has their own WhatsApp Business number (mogul plan only)
  dedicated_whatsapp_number TEXT,
    -- E.164 without '+', only populated when whatsapp_mode = 'dedicated'
  platform_fee_pct     REAL NOT NULL DEFAULT 15.0,
    -- free 15 | starter 7 | business 3 | mogul 1 (enforced app-side, stored for audit/reporting)
  template_id          TEXT DEFAULT 'boutique-fashion',
  content              TEXT DEFAULT '{}',  -- full content+theme JSON
  ai_generations_used  INTEGER DEFAULT 0,
  published_at         INTEGER,
  expires_at           INTEGER,            -- Unix epoch when subscription expires
  updated_at           INTEGER DEFAULT (unixepoch()),
  created_at           INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_sites_owner  ON sites(owner_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_slug   ON sites(draft_subdomain);

-- ── Plans (reference table — source of truth for tier limits) ──────────────
CREATE TABLE IF NOT EXISTS plans (
  plan_id           TEXT PRIMARY KEY,     -- free | starter | business | mogul
  monthly_price_usd REAL NOT NULL,
  platform_fee_pct  REAL NOT NULL,
  max_products      INTEGER,              -- NULL = unlimited
  ai_credits        INTEGER NOT NULL DEFAULT 0,
  whatsapp_mode     TEXT NOT NULL DEFAULT 'shared', -- shared | dedicated
  custom_branding   INTEGER NOT NULL DEFAULT 0,      -- 0 = "Powered by sale.co.zw" badge shown
  custom_domain     INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO plans (plan_id, monthly_price_usd, platform_fee_pct, max_products, ai_credits, whatsapp_mode, custom_branding, custom_domain) VALUES
  ('free',     0,  15.0, 10,   10, 'shared',    0, 0),
  ('starter',  9,   7.0, 100, 100, 'shared',    1, 0),
  ('business', 29,  3.0, NULL,500, 'shared',    1, 1),
  ('mogul',    50,  1.0, NULL,750, 'dedicated', 1, 1);

-- ── Payments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  site_id      TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  reference    TEXT UNIQUE,              -- Paynow reference SCZ-<uuid>
  poll_url     TEXT,
  integration  TEXT,                     -- usd | zig
  currency     TEXT,                     -- USD | ZIG
  amount       REAL,
  purpose      TEXT DEFAULT 'publish',   -- publish | renewal
  status       TEXT DEFAULT 'pending',   -- pending | paid | failed | cancelled
  created_at   INTEGER DEFAULT (unixepoch()),
  confirmed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_payments_site ON payments(site_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref  ON payments(reference);

-- ── Renewal reminder tracking ──────────────────────────────────────────────
ALTER TABLE sites ADD COLUMN renewal_reminder_stage INTEGER;

-- ── Fashion template registry ───────────────────────────────────────────────
-- All 12 templates consume the identical content schema (products, hero,
-- about, gallery, WhatsApp/contact). Only the visual skin differs.
CREATE TABLE IF NOT EXISTS templates (
  template_id     TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  niche           TEXT NOT NULL,     -- who it's aimed at
  palette         TEXT NOT NULL,
  font_pair       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'planned' -- planned | built | live
);
INSERT OR IGNORE INTO templates (template_id, display_name, niche, palette, font_pair, status) VALUES
  ('boutique-fashion',  'Luxury Noir',        'High-end boutique, formalwear',      'black-white-gold', 'dm-mono-sans',       'built'),
  ('fashion-retail',    'Boutique Editorial', 'General boutique, everyday fashion', 'clean-white',       'garamond-inter',     'built'),
  ('streetwear-bold',   'Streetwear Bold',    'Streetwear, hype drops',             'jet-neon',          'condensed-display',  'planned'),
  ('vintage-thrift',    'Vintage Thrift',     'Second-hand, retro resellers',       'sepia-rust',        'typewriter-serif',   'planned'),
  ('minimal-mono',      'Minimal Mono',       'Minimalist basics, capsule brands',  'mono-grey',         'grotesk-sans',       'planned'),
  ('denim-workwear',    'Denim & Workwear',   'Denim, utility, workwear',           'indigo-rust',       'condensed-utility',  'planned'),
  ('faith-modest',      'Faith Collection',   'Church, modest wear',                'sale-green-gold',   'serif-soft',         'planned'),
  ('sports-jersey',     'Sports & Jerseys',   'Football/basketball jerseys, clubs', 'team-bold',         'sports-condensed',   'planned'),
  ('kids-playful',      'Kids Playful',       'Children''s clothing',               'pastel-multi',      'rounded-friendly',   'planned'),
  ('festival-vibrant',  'Festival Vibrant',   'Events, festival merch',             'gradient-pop',       'display-bold',       'planned'),
  ('corporate-uniform', 'Corporate Uniform',  'Company/branded uniforms, bulk',     'navy-steel',        'clean-sans',         'planned'),
  ('bridal-formal',     'Bridal & Formal',    'Bridal, formalwear, occasionwear',   'blush-champagne',   'script-serif',       'planned');

-- ── Seed: first owner (replace phone with real number) ────────────────────
-- INSERT OR IGNORE INTO owners (id, phone, name)
-- VALUES ('usr_001', '263772000000', 'Admin');
