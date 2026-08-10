/* Quinlan ReisApp — front-end logic + gamification */
(function () {
  "use strict";

  const { renderSprite, spriteForMode } = window.QLR_SPRITES;

  const els = {
    results: document.getElementById("results"),
    planBtn: document.getElementById("planBtn"),
    pushBtn: document.getElementById("pushBtn"),
    runner: document.getElementById("runner"),
    chaser: document.getElementById("chaser"),
    flagSlot: document.getElementById("flagSlot"),
    dateHint: document.getElementById("dateHint"),
    status: document.getElementById("status"),
    // HUD
    avatar: document.getElementById("avatar"),
    bubble: document.getElementById("bubbleText"),
    levelNum: document.getElementById("levelNum"),
    levelTitle: document.getElementById("levelTitle"),
    xpFill: document.getElementById("xpFill"),
    xpText: document.getElementById("xpText"),
    coins: document.getElementById("coins"),
    streak: document.getElementById("streak"),
    soundBtn: document.getElementById("soundBtn"),
    achievements: document.getElementById("achievements"),
    fxLayer: document.getElementById("fxLayer"),
    levelup: document.getElementById("levelup"),
    luSprite: document.getElementById("luSprite"),
    luTitle: document.getElementById("luTitle"),
    luText: document.getElementById("luText"),
    luClose: document.getElementById("luClose"),
  };

  // ======================================================================
  //  GAME STATE
  // ======================================================================
  const SAVE_KEY = "qlr.save.v1";
  const defaultState = {
    xp: 0, coins: 0, streak: 0, plays: 0,
    lastPlay: null, minMargin: null, maxMargin: 0,
    seenModes: {}, achievements: {}, muted: false,
  };
  let state = load();

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      return s ? { ...defaultState, ...s } : { ...defaultState };
    } catch (_) { return { ...defaultState }; }
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  const LEVELS = [
    { min: 0,    title: "SNOOZE-ROOKIE" },
    { min: 300,  title: "PERRON-PADAWAN" },
    { min: 700,  title: "SPITS-STRIJDER" },
    { min: 1200, title: "DIENSTREGELING-NINJA" },
    { min: 2000, title: "OV-LEGENDE" },
  ];
  function levelInfo(xp) {
    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
    const cur = LEVELS[idx];
    const next = LEVELS[idx + 1] || null;
    return {
      level: idx + 1,
      title: cur.title,
      floor: cur.min,
      ceil: next ? next.min : cur.min,
      isMax: !next,
    };
  }

  const ACHIEVEMENTS = [
    { id: "first",     icon: "🎫", name: "EERSTE RIT",       test: (s) => s.plays >= 1 },
    { id: "streak3",   icon: "🔥", name: "STREAK ×3",        test: (s) => s.streak >= 3 },
    { id: "streak5",   icon: "🏆", name: "STREAK ×5",        test: (s) => s.streak >= 5 },
    { id: "nippertje", icon: "😰", name: "NIPPERTJE",        test: (s) => s.minMargin != null && s.minMargin < 2 },
    { id: "vroege",    icon: "🐦", name: "VROEGE VOGEL",     test: (s) => s.maxMargin >= 20 },
    { id: "allemodes", icon: "🚉", name: "ALLE VOERTUIGEN",  test: (s) => ["train", "bus", "tram", "metro"].every((m) => s.seenModes[m]) },
    { id: "rijk",      icon: "💰", name: "100 MUNTEN",       test: (s) => s.coins >= 100 },
    { id: "legende",   icon: "👑", name: "OV-LEGENDE",       test: (s) => s.xp >= 2000 },
  ];

  // ======================================================================
  //  SOUND (retro blips, only after a user gesture)
  // ======================================================================
  let audioCtx = null;
  function ensureAudio() {
    if (state.muted) return null;
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function beep(freq, dur, type, when, gain) {
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime + (when || 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain == null ? 0.06 : gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(ac.destination);
    osc.start(t); osc.stop(t + dur);
  }
  const sfx = {
    click: () => beep(440, 0.08, "square"),
    go:    () => { beep(523, 0.09, "square", 0); beep(784, 0.12, "square", 0.09); },
    coin:  () => { beep(988, 0.06, "square", 0); beep(1319, 0.1, "square", 0.06); },
    badge: () => { beep(659, 0.08, "triangle", 0); beep(880, 0.08, "triangle", 0.08); beep(1175, 0.14, "triangle", 0.16); },
    level: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.14, "square", i * 0.11)); },
    fail:  () => { beep(220, 0.2, "sawtooth", 0); beep(150, 0.3, "sawtooth", 0.18); },
  };

  // ======================================================================
  //  HUD RENDERING
  // ======================================================================
  const MOODS = {
    happy:  "quinlan_happy",
    neutral:"quinlan",
    panic:  "quinlan_panic",
    sleepy: "quinlan_sleepy",
  };
  function setAvatar(mood, anim) {
    els.avatar.innerHTML = renderSprite(MOODS[mood] || "quinlan", { scale: 4 });
    if (anim) {
      els.avatar.classList.remove("jump", "shake");
      void els.avatar.offsetWidth; // restart animation
      els.avatar.classList.add(anim);
    }
  }
  function say(text) { els.bubble.innerHTML = text; }

  function updateHUD() {
    const li = levelInfo(state.xp);
    els.levelNum.textContent = "LV " + li.level;
    els.levelTitle.textContent = li.title;
    els.coins.textContent = state.coins;
    els.streak.textContent = state.streak;
    const span = li.isMax ? 1 : (li.ceil - li.floor);
    const into = li.isMax ? 1 : (state.xp - li.floor);
    els.xpFill.style.width = Math.max(0, Math.min(100, (into / span) * 100)) + "%";
    els.xpText.textContent = li.isMax ? "MAX LEVEL · " + state.xp + " XP"
      : state.xp + " / " + li.ceil + " XP";
    els.soundBtn.textContent = state.muted ? "🔇" : "🔊";
    els.soundBtn.classList.toggle("off", state.muted);
    renderAchievements();
  }

  function renderAchievements(justUnlocked) {
    els.achievements.innerHTML = ACHIEVEMENTS.map((a) => {
      const on = !!state.achievements[a.id];
      const just = justUnlocked && justUnlocked.includes(a.id) ? " just" : "";
      return `<div class="badge ${on ? "unlocked" : ""}${just}">` +
        `<span class="b-ico">${a.icon}</span><span class="b-name">${a.name}</span></div>`;
    }).join("");
  }

  // ======================================================================
  //  FX
  // ======================================================================
  function popXP(text, color) {
    const rect = els.coins.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "fx-pop";
    el.textContent = text;
    if (color) el.style.color = color;
    el.style.left = (rect.left - 10) + "px";
    el.style.top = (rect.top - 6) + "px";
    els.fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function showLevelUp(li) {
    els.luSprite.innerHTML = renderSprite("quinlan_happy", { scale: 6 });
    els.luTitle.textContent = "LEVEL " + li.level + "!";
    els.luText.innerHTML = "Je bent nu <b style='color:var(--yellow)'>" + li.title + "</b>.<br>Nog steeds te laat, maar met stijl.";
    els.levelup.classList.add("show");
    sfx.level();
  }
  els.luClose.addEventListener("click", () => els.levelup.classList.remove("show"));

  // ======================================================================
  //  helpers
  // ======================================================================
  const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
  const fmtDur = (sec) => {
    const m = Math.round(sec / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)}u ${String(m % 60).padStart(2, "0")}m`;
  };
  const modeLabel = (mode) => {
    const M = (mode || "").toUpperCase();
    if (["WALK", "FOOT"].includes(M)) return "lopen";
    if (["BUS", "COACH"].includes(M)) return "bus";
    if (M === "TRAM") return "tram";
    if (["SUBWAY", "METRO"].includes(M)) return "metro";
    return "trein";
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const localDate = () => new Date().toLocaleDateString("en-CA");
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString("en-CA"); };
  const marginMin = (targetIso, arriveIso) => Math.round((new Date(targetIso) - new Date(arriveIso)) / 60000);

  function stateBox(bigText, subText) {
    els.results.innerHTML =
      `<div class="state"><span class="big">${esc(bigText)}</span>${esc(subText || "")}</div>`;
  }

  const QUIPS = {
    happy: ["Zeeën van tijd. Tóch te laat? 😏", "Makkie. Geen excuus vandaag.", "Kom op, dit haalt een slak ook."],
    neutral: ["Krap-aan, maar het kan.", "Niet treuzelen bij de koffie.", "Eén keer snoozen = missen, hé."],
    panic: ["OP HET NIPPERTJE. RENNEN! 🏃", "Nu al te laat in je hoofd?", "Elke seconde telt, Quinlan!"],
    sleepy: ["Geen enkele rit haalt 08:30. 😴", "Zelfs het OV geeft je op vandaag."],
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ======================================================================
  //  RENDER TRIPS
  // ======================================================================
  let currentTarget = null;

  function riskFor(margin) {
    if (margin >= 12) return { stars: 3, cls: "good", label: `+${margin}m marge` };
    if (margin >= 5)  return { stars: 2, cls: "mid",  label: `+${margin}m marge` };
    return { stars: 1, cls: "bad", label: margin <= 0 ? "0m — RENNEN!" : `+${margin}m — krap!` };
  }

  function renderTrip(opt, index) {
    const best = index === 0; // latest arrival = the classic "last chance"
    const margin = currentTarget ? marginMin(currentTarget, opt.arriveTime) : 0;
    const risk = riskFor(margin);
    const pts = 20 + margin * 2 + (3 - Math.min(3, opt.transfers)) * 5;

    const legsHtml = opt.legs.map((leg, i) => {
      const isWalk = ["WALK", "FOOT", "BIKE"].includes((leg.mode || "").toUpperCase());
      const sprite = renderSprite(spriteForMode(leg.mode), { scale: 2 });
      const lineText = isWalk ? "lopen" : (leg.line ? esc(leg.line) : modeLabel(leg.mode));
      const sub = isWalk ? fmtDur(leg.durationSec) : (leg.headsign ? esc(leg.headsign) : esc(leg.toName || ""));
      const arrow = i < opt.legs.length - 1 ? '<span class="leg-arrow">▶</span>' : "";
      return `<div class="leg ${isWalk ? "walk" : ""}">${sprite}` +
        `<span class="line">${lineText}<small>${sub}</small></span></div>${arrow}`;
    }).join("");

    const stars = "★★★".split("").map((s, i) =>
      `<span class="${i < risk.stars ? "on" : ""}">★</span>`).join("");
    const changes = opt.transfers === 0 ? "direct" : `${opt.transfers}× overstap`;

    return (
      `<article class="trip ${best ? "best" : ""}">` +
      `<span class="rank">${best ? "★ LAATSTE KANS" : "#" + (index + 1)}</span>` +
      `<span class="pts">+${pts} XP</span>` +
      `<div class="trip-top">` +
      `<div class="times"><span class="dep">${fmtTime(opt.departTime)}</span>` +
      `<span class="sep">▶</span><span class="arr">${fmtTime(opt.arriveTime)}</span></div>` +
      `<div class="meta"><b>${fmtDur(opt.durationSec)}</b><br />${changes}</div>` +
      `</div>` +
      `<div class="risk"><span class="stars">${stars}</span><span class="marge ${risk.cls}">${risk.label}</span></div>` +
      `<div class="legs">${legsHtml}</div>` +
      `</article>`
    );
  }

  // ======================================================================
  //  SCORING
  // ======================================================================
  function scorePlan(data) {
    const opts = data.options || [];
    currentTarget = data.arriveBy;

    if (opts.length === 0) {
      setAvatar("sleepy", "shake");
      say(pick(QUIPS.sleepy));
      sfx.fail();
      return;
    }

    const margins = opts.map((o) => marginMin(data.arriveBy, o.arriveTime));
    const lastMargin = Math.min(...margins); // the last-chance buffer
    const safeMargin = Math.max(...margins);

    // mood + quip based on the tightest option (the gag)
    let mood = "neutral";
    if (lastMargin >= 8) mood = "happy";
    else if (lastMargin < 3) mood = "panic";
    setAvatar(mood, mood === "panic" ? "shake" : "jump");
    say(pick(QUIPS[mood]));

    // track modes seen (for the "alle voertuigen" badge)
    opts.forEach((o) => o.legs.forEach((l) => {
      const sp = spriteForMode(l.mode);
      if (["train", "bus", "tram", "metro"].includes(sp)) state.seenModes[sp] = true;
    }));

    // margins records
    state.minMargin = state.minMargin == null ? lastMargin : Math.min(state.minMargin, lastMargin);
    state.maxMargin = Math.max(state.maxMargin, safeMargin);

    const beforeLevel = levelInfo(state.xp).level;
    const today = localDate();
    const firstToday = state.lastPlay !== today;
    let gainedXP = 0, gainedCoins = 0;

    if (firstToday) {
      state.streak = state.lastPlay === yesterday() ? state.streak + 1 : 1;
      state.plays += 1;
      state.lastPlay = today;
      gainedXP = 60 + safeMargin * 4 + opts.length * 10 + 100 /*dagbonus*/;
      gainedCoins = Math.max(1, lastMargin) + 5 + state.streak * 2;
      popXP("DAGBONUS +100", "var(--yellow)");
    } else {
      gainedXP = 8; // oefen-XP bij opnieuw plannen
      gainedCoins = 1;
    }

    state.xp += gainedXP;
    state.coins += gainedCoins;
    popXP("+" + gainedXP + " XP");
    setTimeout(() => popXP("+" + gainedCoins + " 🪙", "var(--yellow)"), 220);
    els.coins.parentElement.classList.add("bump");
    setTimeout(() => els.coins.parentElement.classList.remove("bump"), 320);
    sfx.coin();

    // achievements
    const newly = [];
    ACHIEVEMENTS.forEach((a) => {
      if (!state.achievements[a.id] && a.test(state)) { state.achievements[a.id] = true; newly.push(a.id); }
    });

    save();
    updateHUD();
    if (newly.length) {
      renderAchievements(newly);
      setTimeout(() => { sfx.badge(); popXP("PRESTATIE! 🏅", "var(--cyan)"); }, 400);
    }

    // level up
    const afterLevel = levelInfo(state.xp).level;
    if (afterLevel > beforeLevel) setTimeout(() => showLevelUp(levelInfo(state.xp)), newly.length ? 900 : 500);
  }

  // ======================================================================
  //  RESULTS
  // ======================================================================
  function renderResults(data) {
    if (!data.options || data.options.length === 0) {
      stateBox("GAME OVER", "Geen rit haalt 08:30. Blijf maar in bed. 😴");
      scorePlan(data);
      return;
    }
    els.dateHint.textContent =
      `Reisdatum ${new Date(data.travelDate).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })} — laatste ${data.count} ritten die je om 08:30 binnen hebben.`;
    currentTarget = data.arriveBy;
    els.results.innerHTML = data.options.map(renderTrip).join("");
    scorePlan(data);
  }

  // ======================================================================
  //  FETCH
  // ======================================================================
  async function loadPlan(userInitiated) {
    if (userInitiated) sfx.go();
    els.chaser.classList.add("run"); // Quinlan rent eeuwig achter het OV aan
    els.planBtn.disabled = true;
    els.planBtn.textContent = "▶ LADEN...";
    setAvatar("neutral");
    say("Momentje, ik zoek je excuses bij elkaar...");
    stateBox("LADEN", "De conducteur telt je snoozes...");
    els.status.textContent = "";
    try {
      const res = await fetch("./api/journeys", { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.message || `HTTP ${res.status}`);
      renderResults(data);
      els.status.textContent = `Bijgewerkt ${fmtTime(data.generatedAt)} · bron Transitous`;
    } catch (err) {
      stateBox("SEINSTORING", "Kon de reisinfo niet ophalen. Probeer het zo nog eens.");
      setAvatar("panic", "shake");
      say("Seinstoring! (het échte excuus 😅)");
      els.status.textContent = String(err.message || err);
    } finally {
      els.planBtn.disabled = false;
      els.planBtn.textContent = "▶ PLAN OPNIEUW";
    }
  }

  // ======================================================================
  //  EVENTS + BOOT
  // ======================================================================
  els.planBtn.addEventListener("click", () => loadPlan(true));

  els.soundBtn.addEventListener("click", () => {
    state.muted = !state.muted;
    save(); updateHUD();
    if (!state.muted) sfx.click();
  });

  // Poke Quinlan: easter egg
  let pokes = 0;
  els.avatar.addEventListener("click", () => {
    pokes++;
    sfx.click();
    setAvatar(pick(["happy", "neutral", "panic"]), "jump");
    const lines = ["Au. Niet duwen, ik ben al laat.", "Hé! Ik snoozede net lekker.", "Poke me niet, poke de wekker.", "Doe eens rustig, planner."];
    say(pokes >= 5 ? "Oké oké! +5 munten, laat me met rust 😅" : pick(lines));
    if (pokes === 5) { state.coins += 5; save(); updateHUD(); popXP("+5 🪙", "var(--yellow)"); sfx.coin(); }
  });

  // Decorative sprites
  els.runner.innerHTML = renderSprite("train", { scale: 6 });
  els.chaser.innerHTML = renderSprite("quinlan_panic", { scale: 3 });
  els.chaser.style.animationDelay = "1.4s";
  els.flagSlot.innerHTML = renderSprite("flag", { scale: 3 });

  const parade = ["train", "bus", "tram", "metro"];
  let paradeIx = 0;
  els.runner.addEventListener("animationiteration", () => {
    paradeIx = (paradeIx + 1) % parade.length;
    els.runner.innerHTML = renderSprite(parade[paradeIx], { scale: 6 });
  });

  setAvatar("neutral");
  updateHUD();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }

  // ======================================================================
  //  PUSH (scaffold — "elke ochtend wekken")
  // ======================================================================
  async function togglePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      els.status.textContent = "Push wordt niet ondersteund op dit apparaat.";
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { els.status.textContent = "Meldingen geweigerd."; return; }
      const reg = await navigator.serviceWorker.ready;
      const cfg = await fetch("./api/vapid").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!cfg || !cfg.publicKey) {
        reg.showNotification("Quinlan ReisApp", {
          body: "🚆 Ochtendmelding staat aan! Straks stuur ik je elke dag je excuses.",
          icon: "./icons/icon-192.png", badge: "./icons/icon-192.png",
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
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub),
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

  // Auto-plan on first load (no sfx until the user interacts)
  loadPlan(false);
})();
