/*
 * Quinlan ReisApp — daily journey planner
 * ----------------------------------------
 * Used by src/worker.js (Cloudflare Worker); also Pages-Functions compatible.
 *
 * Route is FIXED (it's a gag app for one perpetually-late colleague):
 *
 *   FROM  Verlengde Duinvallei 131, 1361 BR Almere
 *   TO    Rondebeltweg 51, 1329 BP Almere
 *
 * We ask the public, free, no-key Transitous / MOTIS routing service for
 * journeys that ARRIVE BY 08:30 and hand back the last 5 (the 5 latest
 * departures that still make it in time) — the perfect stack of excuses.
 *
 * Data source: https://transitous.org  (MOTIS engine, GTFS for NL)
 * Docs:        https://api.transitous.org / motis-project.de/docs/api
 */

const MOTIS = "https://api.transitous.org";
const TZ = "Europe/Amsterdam";
const UA = "QuinlanReisApp/1.0 (+https://github.com/markkuijpers31-lab/ql-reisapp)";

const FROM_ADDRESS = "Verlengde Duinvallei 131, 1361 BR Almere";
const TO_ADDRESS = "Rondebeltweg 51, 1329 BP Almere";

// Rough Almere-area bias + safety fallbacks if geocoding ever hiccups.
const ALMERE_BIAS = { lat: 52.3708, lon: 5.2647 };
const FROM_FALLBACK = { lat: 52.3389, lon: 5.1636, name: FROM_ADDRESS };
const TO_FALLBACK = { lat: 52.3986, lon: 5.2903, name: TO_ADDRESS };

const ARRIVE_HOUR = 8;
const ARRIVE_MIN = 30;

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const dateOverride = url.searchParams.get("date"); // YYYY-MM-DD (optional, for testing)

  try {
    const target = targetArrival(dateOverride);

    const [from, to] = await Promise.all([
      geocode(FROM_ADDRESS, FROM_FALLBACK),
      geocode(TO_ADDRESS, TO_FALLBACK),
    ]);

    const itineraries = await plan(from, to, target.iso);

    // Keep only journeys that actually arrive at/before 08:30, newest first.
    const targetMs = new Date(target.iso).getTime();
    const options = itineraries
      .filter((it) => new Date(it.endTime).getTime() <= targetMs + 60 * 1000)
      .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
      .slice(0, 5)
      .map(simplify);

    return json({
      app: "Quinlan ReisApp",
      generatedAt: new Date().toISOString(),
      timezone: TZ,
      arriveBy: target.iso,
      arriveByLabel: "08:30",
      travelDate: target.date,
      from: { address: FROM_ADDRESS, name: from.name, lat: from.lat, lon: from.lon },
      to: { address: TO_ADDRESS, name: to.name, lat: to.lat, lon: to.lon },
      count: options.length,
      options,
    });
  } catch (err) {
    return json(
      { error: true, message: String(err && err.message ? err.message : err) },
      502
    );
  }
}

// --- MOTIS calls ----------------------------------------------------------

async function geocode(text, fallback) {
  const qs = new URLSearchParams({
    text,
    numResults: "5",
    place: `${ALMERE_BIAS.lat},${ALMERE_BIAS.lon}`,
    language: "nl",
  });
  try {
    const res = await fetch(`${MOTIS}/api/v1/geocode?${qs}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const matches = await res.json();
    if (!Array.isArray(matches) || matches.length === 0) throw new Error("no match");
    // Prefer a result in Almere; otherwise take the highest-scoring one.
    const inAlmere = matches.find((m) =>
      JSON.stringify(m.areas || []).toLowerCase().includes("almere")
    );
    const best = inAlmere || matches[0];
    return { lat: best.lat, lon: best.lon, name: best.name || text };
  } catch (_) {
    return fallback; // never let the gag app fully fail
  }
}

async function plan(from, to, timeISO) {
  const qs = new URLSearchParams({
    fromPlace: `${from.lat},${from.lon}`,
    toPlace: `${to.lat},${to.lon}`,
    time: timeISO,
    arriveBy: "true",
    numItineraries: "12",
    transitModes: "TRANSIT",
    pedestrianProfile: "FOOT",
  });
  const res = await fetch(`${MOTIS}/api/v6/plan?${qs}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`plan ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.itineraries) ? data.itineraries : [];
}

// --- Shaping the response -------------------------------------------------

function simplify(it) {
  const legs = (it.legs || []).map((leg) => ({
    mode: leg.mode,
    line: leg.routeShortName || leg.displayName || null,
    headsign: leg.headsign || null,
    fromName: leg.from && leg.from.name ? leg.from.name : null,
    toName: leg.to && leg.to.name ? leg.to.name : null,
    departTime: leg.startTime,
    arriveTime: leg.endTime,
    durationSec: leg.duration,
    realTime: !!leg.realTime,
  }));

  // A "real" leg count that ignores tiny walk transfers for the summary line.
  const transitLegs = legs.filter(
    (l) => !["WALK", "FOOT", "BIKE", "CAR"].includes((l.mode || "").toUpperCase())
  );

  return {
    departTime: it.startTime,
    arriveTime: it.endTime,
    durationSec: it.duration,
    transfers: it.transfers,
    transitLegCount: transitLegs.length,
    legs,
  };
}

// --- Time helpers (Europe/Amsterdam aware) --------------------------------

/** Current wall-clock in Amsterdam as {y,m,d,hh,mm}. */
function amsterdamNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    y: +get("year"), m: +get("month"), d: +get("day"),
    hh: +get("hour"), mm: +get("minute"),
  };
}

/** Offset string like "+02:00" for the given date at ~08:30 Amsterdam. */
function tzOffset(dateStr) {
  const probe = new Date(`${dateStr}T08:30:00Z`);
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, timeZoneName: "longOffset",
  })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName").value; // e.g. "GMT+02:00"
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? `${m[1]}${m[2]}:${m[3]}` : "+00:00";
}

/**
 * Work out which morning we're planning for.
 * Default: the next 08:30 in Amsterdam (today if it's still before 08:30,
 * otherwise tomorrow). Optionally overridden with ?date=YYYY-MM-DD.
 */
function targetArrival(dateOverride) {
  let dateStr = dateOverride;
  if (!dateStr) {
    const now = amsterdamNow();
    const pad = (n) => String(n).padStart(2, "0");
    let { y, m, d } = now;
    const pastCutoff = now.hh > ARRIVE_HOUR || (now.hh === ARRIVE_HOUR && now.mm >= ARRIVE_MIN);
    if (pastCutoff) {
      // roll to tomorrow via UTC math (date-only, DST-safe enough for a day bump)
      const next = new Date(Date.UTC(y, m - 1, d + 1));
      y = next.getUTCFullYear(); m = next.getUTCMonth() + 1; d = next.getUTCDate();
    }
    dateStr = `${y}-${pad(m)}-${pad(d)}`;
  }
  const off = tzOffset(dateStr);
  const hh = String(ARRIVE_HOUR).padStart(2, "0");
  const mm = String(ARRIVE_MIN).padStart(2, "0");
  return { date: dateStr, iso: `${dateStr}T${hh}:${mm}:00${off}` };
}

// --- HTTP helper ----------------------------------------------------------

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
