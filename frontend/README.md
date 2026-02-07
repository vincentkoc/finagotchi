# finagotchi — frontend

Memory-aware finance operations agent with a virtual pet UX.

## Stack

- Next.js 15 (App Router)
- TypeScript, Tailwind CSS
- Framer Motion (animations)
- Cytoscape.js (knowledge graph)

## Getting started

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` (defaults to `http://localhost:8000`).

## Finance dimensions

- **risk** risk-averse vs risk-tolerant
- **compliance** lenient vs strict
- **thriftiness** spender vs thrifty
- **anomaly sensitivity** oblivious vs vigilant

## Structure

- `app/play/` — main gameplay (pet viewport, dialog, graph panel)
- `app/create/` — agent recruitment
- `app/scrapbook/` — personnel records (past agents)
- `app/about/` — about page
- `constants/` — finance stats, evolutions, scenarios, sprites
- `lib/api.ts` — typed API client for backend
- `components/` — shared UI primitives (Window, Menu, etc.)
