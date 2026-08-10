/* Quinlan ReisApp — front-end logic */
(function () {
  "use strict";

  const { renderSprite, spriteForMode } = window.QLR_SPRITES;

  const els = {
    results: document.getElementById("results"),
    planBtn: document.getElementById("planBtn"),
    pushBtn: document.getElementById("pushBtn"),
    runner: document.getElementById("runner"),
    flagSlot: document.getElementById("flagSlot"),
    dateHint: document.getElementById("dateHint"),
    status: document.getElementById("status"),
  };

  // Decorative sprites
  els.runner.innerHTML = renderSprite("train", { scale: 6 });
  els.flagSlot.innerHTML = renderSprite("flag", { scale: 3 });

  // Cycle the driving sprite through all four vehicles for fun
  const parade = ["train", "bus", "tram", "metro"];
  let paradeIx = 0;
  els.runner.addEventListener("animationiteration", () => {
    paradeIx = (paradeIx + 1) % parade.length;
    els.runner.innerHTML = renderSprite(parade[paradeIx], { scale: 6 });
  });

  // --- helpers -----------------------------------------------------------
  const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString("nl-NL", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
    });

  const fmtDur = (sec) => {
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)}u ${String(m % 60).padStart(2, "0")}m`;
  };

  const modeLabel = (mode) => {
    const M = (mode || "").toUpperCase();
    if (["WALK", "FOOT"].includes(M)) return "lopen";
    if (["BUS", "COACH"].includes(M)) return "bus";
    if (M === "TRAM") return "tram";
    if (["SUBWAY", "METRO"].includes(M)) return "metro";
    return "trein";
  };

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function stateBox(bigText, subText) {
    els.results.innerHTML =
      `<div class="state"><span class="big">${esc(bigText)}</span>${esc(subText || "")}</div>`;
  }

  // --- render ------------------------------------------------------------
  function renderTrip(opt, index) {
    const best = index === 0;
    const legsHtml = opt.legs
      .map((leg, i) => {
        const isWalk = ["WALK", "FOOT", "BIKE"].includes((leg.mode || "").toUpperCase());
        const sprite = renderSprite(spriteForMode(leg.mode), { scale: 2 });
        const lineText = isWalk
          ? "lopen"
          : (leg.line ? esc(leg.line) : modeLabel(leg.mode));
        const sub = isWalk
          ? fmtDur(leg.durationSec)
          : (leg.headsign ? esc(leg.headsign) : esc(leg.toName || ""));
        const arrow = i < opt.legs.length - 1 ? '<span class="leg-arrow">▶</span>' : "";
        return (
          `<div class="leg ${isWalk ? "walk" : ""}">${sprite}` +
          `<span class="line">${lineText}<small>${sub}</small></span></div>${arrow}`
        );
      })
      .join("");

    const changes =
      opt.transfers === 0 ? "direct" :
      `${opt.transfers}× overstap`;

    return (
      `<article class="trip ${best ? "best" : ""}">` +
      `<span class="rank">${best ? "★ LAATSTE KANS" : "#" + (index + 1)}</span>` +
      `<div class="trip-top">` +
      `<div class="times"><span class="dep">${fmtTime(opt.departTime)}</span>` +
      `<span class="sep">▶</span><span class="arr">${fmtTime(opt.arriveTime)}</span></div>` +
      `<div class="meta"><b>${fmtDur(opt.durationSec)}</b><br />${changes}</div>` +
      `</div>` +
      `<div class="legs">${legsHtml}</div>` +
      `</article>`
    );
  }

  function renderResults(data) {
    if (!data.options || data.options.length === 0) {
      stateBox("GAME OVER", "Geen rit gevonden die je nog om 08:30 haalt. Blijf maar in bed. 😴");
      return;
    }
    els.dateHint.textContent =
      `Reisdatum ${new Date(data.travelDate).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })} — laatste ${data.count} ritten die je om 08:30 binnen hebben.`;
    els.results.innerHTML = data.options.map(renderTrip).join("");
  }

  // --- fetch -------------------------------------------------------------
  async function loadPlan() {
    els.planBtn.disabled = true;
    els.planBtn.textContent = "▶ LADEN...";
    stateBox("LADEN", "De conducteur zoekt je excuses bij elkaar...");
    els.status.textContent = "";
    try {
      const res = await fetch("./api/journeys", { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.message || `HTTP ${res.status}`);
      renderResults(data);
      els.status.textContent = `Bijgewerkt ${fmtTime(data.generatedAt)} · bron Transitous`;
    } catch (err) {
      stateBox("SEINSTORING", "Kon de reisinfo niet ophalen. Probeer het zo nog eens.");
      els.status.textContent = String(err.message || err);
    } finally {
      els.planBtn.disabled = false;
      els.planBtn.textContent = "▶ PLAN OPNIEUW";
    }
  }

  els.planBtn.addEventListener("click", loadPlan);

  // --- push notifications (scaffold — klaar voor "elke ochtend wekken") --
  async function togglePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      els.status.textContent = "Push wordt niet ondersteund op dit apparaat.";
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        els.status.textContent = "Meldingen geweigerd.";
        return;
      }
      const reg = await navigator.serviceWorker.ready;

      // VAPID public key is injected server-side when configured (see README).
      const cfg = await fetch("./api/vapid").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!cfg || !cfg.publicKey) {
        // No server keys yet: still show the local demo notification so the
        // colleague sees it works. Daily server push is enabled in README step.
        reg.showNotification("Quinlan ReisApp", {
          body: "🚆 Ochtendmelding staat aan! Straks stuur ik je elke dag je excuses.",
          icon: "./icons/icon-192.png",
          badge: "./icons/icon-192.png",
        });
        els.pushBtn.classList.add("on");
        els.status.textContent = "Meldingen aan (lokaal). Serverpush: zie README.";
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(cfg.publicKey),
      });
      await fetch("./api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      els.pushBtn.classList.add("on");
      els.status.textContent = "Ochtendmeldingen geactiveerd! ⏰";
    } catch (err) {
      els.status.textContent = "Push mislukt: " + (err.message || err);
    }
  }

  function urlB64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  els.pushBtn.addEventListener("click", togglePush);

  // --- service worker + boot --------------------------------------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  // Auto-plan on first load
  loadPlan();
})();
