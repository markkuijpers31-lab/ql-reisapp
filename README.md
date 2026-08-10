# 🚆 Quinlan ReisApp

An 8-bit PWA that plans **one trip a day** on Dutch public transport — a running
joke for a colleague who's always late and blames the OV. Every morning it shows
the **last 5 journeys** that would still get you from home to the office by
**08:30**. No more excuses. 🎮

- **From:** Verlengde Duinvallei 131, 1361 BR Almere
- **To:** Rondebeltweg 51, 1329 BP Almere
- **Arrive by:** 08:30

The route is intentionally fixed — this is a gag app, not a real planner.

## How it works

| Piece | What it does |
|-------|--------------|
| `public/` | The 8-bit PWA (HTML/CSS/JS, hand-drawn pixel sprites, manifest, service worker). |
| `functions/api/journeys.js` | Cloudflare Pages Function. Geocodes the two addresses and asks MOTIS for journeys arriving by 08:30, returns the last 5. |
| `functions/api/subscribe.js` · `vapid.js` | Push-notification endpoints (store subscription, expose the public key). |
| `worker/daily-push.js` | Separate Cloudflare Worker with a cron trigger that pings everyone every weekday morning. |
| `tools/` | Asset + VAPID key generators (no dependencies). |

### Transit data
Journeys come from **[Transitous](https://transitous.org)** — a free,
community-run routing service powered by the **MOTIS** engine using the
Netherlands GTFS feeds. No API key required.

- Geocoding: `GET https://api.transitous.org/api/v1/geocode`
- Routing: `GET https://api.transitous.org/api/v6/plan?arriveBy=true`

The custom pixel sprites for **train, bus, tram and metro** — plus an 8-bit
portrait of **Quinlan himself** (four moods: neutral, happy, panic, sleepy) —
are hand-drawn in [`public/sprites.js`](public/sprites.js) and rendered as
crisp, scalable SVG.

### Gamification 🎮
Quinlan is the mascot and the whole thing plays like a mini-game (state saved in
`localStorage`):

- **XP & levels** with playful Dutch ranks (Snooze-Rookie → OV-Legende) and a
  level-up screen.
- **Munten (coins)** and a **daily streak** 🔥 (plan every morning to keep it).
- **Risk meter per rit**: stars + "marge" badge showing how tight each option is
  (the *Laatste Kans* is the riskiest — that's the joke).
- **Prestaties (achievements)**: Eerste Rit, Nippertje, Vroege Vogel, Alle
  Voertuigen, OV-Legende, …
- **Moods & quips**: Quinlan panics on a tight margin, grins with lots of slack,
  and falls asleep if nothing makes 08:30. He also perpetually runs after the
  train on the track. Poke him for an easter egg.
- **Retro sound effects** (WebAudio, toggle with 🔊).

## Local development

```bash
npm install
npm run dev          # wrangler pages dev (serves public/ + functions/)
```

Open http://localhost:8788 and tap **PLAN MIJN RIT**.

The app icon is Quinlan himself (grinning, arcade sunburst, pixel platform).
Regenerate after changing the portrait sprite:

```bash
npm run gen:assets   # writes public/icons/icon.svg + rasterize.html
# then: chromium --headless --dump-dom public/icons/rasterize.html
# and save the base64 <div>s as PNGs (viewport-independent, pixel-perfect)
```

## Deploy to Cloudflare Pages

```bash
npx wrangler pages deploy      # uses wrangler.toml (output dir = public/)
```

Or connect the repo in the Cloudflare dashboard (Pages → build output `public`).
Functions in `functions/` are picked up automatically.

## Enable the daily morning push (optional — "elke ochtend wekken")

1. **Generate VAPID keys** (once):
   ```bash
   npm run gen:vapid
   ```
2. **Create a KV namespace** for subscriptions and bind it as `SUBSCRIPTIONS`
   in both `wrangler.toml` (Pages) and `worker/wrangler.toml` (Worker):
   ```bash
   npx wrangler kv namespace create SUBSCRIPTIONS
   ```
3. **Configure the Pages project**: set `VAPID_PUBLIC_KEY`, uncomment the KV
   binding in `wrangler.toml`, and redeploy.
4. **Deploy the cron worker**:
   ```bash
   cd worker
   npx wrangler secret put VAPID_PRIVATE_JWK   # paste the JWK from step 1
   npx wrangler deploy                          # cron: weekday 05:15 UTC (~07:15 NL)
   ```
5. In the app, tap **🔔 WEK MIJ** to grant notification permission and subscribe.

Until the keys are configured the button still works — it shows a local test
notification so you can see the effect immediately.

---

_Een grapje. Blijf niet in bed liggen._ 😴
