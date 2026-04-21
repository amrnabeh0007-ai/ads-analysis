# Media Buyer Copilot (Bilingual)

A Next.js + Tailwind internal decision-support tool for ecommerce media buyers.

## What this app does

- Analyzes ad + funnel metrics to detect bottlenecks.
- Provides rule-based diagnosis with severity and evidence.
- Supports English + Arabic UI (LTR/RTL).
- Includes creative analysis, landing page audit, product profitability check, and strategic recommendations.
- Generates an export-ready internal report view.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy on Vercel

1. Push repo to GitHub.
2. Import project in Vercel.
3. Keep default Next.js build settings.
4. Deploy.

## Project structure

- `app/` - Next.js routes and global styles.
- `components/` - UI modules (main app, cards, tabs).
- `data/` - mock data + demo scenarios.
- `lib/` - translations, diagnosis engine, types.
- `public/` - static assets + CSV template.

## Data input methods

- CSV upload (with template: `public/sample-template.csv`).
- Manual forms.
- JSON paste import.

## Where to edit key logic

- Benchmarks defaults: `data/mockData.ts`
- Business inputs defaults (price/cost/CPA/ROAS): `data/mockData.ts`
- Diagnosis rules: `lib/diagnosis.ts`
- Bilingual text: `lib/i18n.ts`

## Future integrations

This version is mock-data first. To integrate real sources later, add adapters in `lib/`:

- Meta Ads API adapter
- Shopify adapter
- Google Sheets sync
- PageSpeed API fetcher

Then map fetched payloads into `AdMetrics` and `LandingPageAuditInput` types.
