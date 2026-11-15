/* City Crush (web). Depends on core.js (window.Core). */
(function () {
  'use strict';

  // ====================================================================== config
  const ROWS = 8, COLS = 8;
  const LEVELS = 12, BONUS_EVERY = 3, BONUS_MOVES = 2;   // +2 moves every 3 levels: 15, 17, 19, 21
  const BASE_MOVES = 15, BASE_TARGET = 1000, TARGET_STEP = 250;
  const REWARD_MOVES = 5, MAX_REWARDS = 2;
  const BOOSTERS = { hammer: 2, shuffle: 2, hint: 3 };
  const SAVE_KEY = 'landmarkMatch.progress.v1';
  const START_COUNTRY = 'UK';
  const IDLE_HINT_MS = 7000;

  const TILE_BG = ['#e04a4a', '#3d84e0', '#3fae55', '#e0a526', '#8d52d4', '#ee7d2a'];

  const COUNTRIES = [
    { id: 'UK', name: 'United Kingdom', files: ['big-ben', 'tower-bridge', 'london-eye', 'buckingham-palace', 'red-bus', 'stonehenge'], names: ['Big Ben', 'Tower Bridge', 'London Eye', 'Buckingham Palace', 'Red Bus', 'Stonehenge'] },
    { id: 'FR', name: 'France', files: ['eiffel-tower', 'arc-de-triomphe', 'louvre-pyramid', 'notre-dame', 'mont-saint-michel', 'versailles'], names: ['Eiffel Tower', 'Arc de Triomphe', 'Louvre Pyramid', 'Notre-Dame', 'Mont Saint-Michel', 'Versailles'] },
    { id: 'IT', name: 'Italy', files: ['colosseum', 'leaning-tower-of-pisa', 'trevi-fountain', 'venice-gondola', 'st-peters-basilica', 'florence-duomo'], names: ['Colosseum', 'Tower of Pisa', 'Trevi Fountain', 'Gondola', "St. Peter's", 'Florence Duomo'] },
    { id: 'EG', name: 'Egypt', files: ['great-pyramid', 'sphinx', 'karnak-temple', 'abu-simbel', 'nile-felucca', 'cairo-citadel'], names: ['Great Pyramid', 'Sphinx', 'Karnak Temple', 'Abu Simbel', 'Felucca', 'Cairo Citadel'] },
    { id: 'JP', name: 'Japan', files: ['mount-fuji', 'torii-gate', 'himeji-castle', 'tokyo-tower', 'kinkaku-ji', 'pagoda'], names: ['Mount Fuji', 'Torii Gate', 'Himeji Castle', 'Tokyo Tower', 'Kinkaku-ji', 'Pagoda'] },
    { id: 'US', name: 'United States', files: ['statue-of-liberty', 'golden-gate-bridge', 'mount-rushmore', 'white-house', 'space-needle', 'hollywood-sign'], names: ['Statue of Liberty', 'Golden Gate', 'Mount Rushmore', 'White House', 'Space Needle', 'Hollywood Sign'] },
  ];
  COUNTRIES.forEach((c, i) => { c.flag = ['gb', 'fr', 'it', 'eg', 'jp', 'us'][i]; });
  // Every other UN member state: its flag, plus six shared landmark-type tiles until country-specific art is added.
  const GENERIC = { dir: '_generic', files: ['pyramid', 'castle', 'bridge', 'tower', 'mountain', 'arch'], names: ['Pyramid', 'Castle', 'Bridge', 'Tower', 'Mountain', 'Arch'] };
  (window.EXTRA_COUNTRIES || []).forEach(([id, name]) => COUNTRIES.push(Object.assign({ id, name, flag: id.toLowerCase(), generic: true }, GENERIC)));
  const byId = (id) => COUNTRIES.find((c) => c.id === id) || COUNTRIES[0];
  const lmPath = (c, i) => 'landmarks/' + (c.dir || c.id) + '/' + i + '_' + c.files[i] + '.png';

  const RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const T = (ms) => (RM ? Math.round(ms * 0.45) : ms);

  const $ = (id) => document.getElementById(id);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ease = (k) => k * k * (3 - 2 * k);
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);

  function levelParams(n) {
    return { moves: BASE_MOVES + BONUS_MOVES * Math.floor((n - 1) / BONUS_EVERY), target: BASE_TARGET + (n - 1) * TARGET_STEP };
  }

  // ====================================================================== tiny DOM helper
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const k in props || {}) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
  }

  // ====================================================================== icons
  const S = (inner, extra) => '<svg viewBox="0 0 24 24" fill="currentColor" ' + (extra || '') + '>' + inner + '</svg>';
  const STROKE = 'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const ICON = {
    pause: S('<path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/>'),
    play: S('<path d="M7 4.5v15l12.5-7.5z"/>'),
    back: S('<path d="M15 5l-7 7 7 7" ' + STROKE + ' stroke-width="3.2"/>'),
    sliders: S('<path d="M3.5 7h9M17.5 7h3M3.5 12h3M11.5 12h9M3.5 17h11M19.5 17h1" ' + STROKE + '/><circle cx="15" cy="7" r="2.6"/><circle cx="9" cy="12" r="2.6"/><circle cx="17" cy="17" r="2.6"/>'),
    sound: S('<path d="M3.5 9.5v5H7l5 4v-13L7 9.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" ' + STROKE + ' stroke-width="2.2"/>'),
    mute: S('<path d="M3.5 9.5v5H7l5 4v-13L7 9.5z"/><path d="M15.5 9.5l5 5m0-5l-5 5" ' + STROKE + ' stroke-width="2.4"/>'),
    lock: S('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ' + STROKE + ' stroke-width="2.4"/>'),
    check: S('<path d="M5 12.5l4.5 4.5L19 7.5" ' + STROKE + ' stroke-width="3.4"/>'),
    hammer: S('<rect x="2.5" y="4" width="12" height="6.5" rx="1.6" transform="rotate(40 8.5 7.2)"/><rect x="10.6" y="8.8" width="3.4" height="13" rx="1.6" transform="rotate(-48 12.3 15.3)"/>'),
    shuffle: S('<path d="M3 7.5h3.6c4.4 0 5.6 9 10.4 9H20M3 16.5h3.6c1.4 0 2.5-.8 3.5-2M13.6 9.4c.9-1 2-1.9 3.4-1.9H20" ' + STROKE + ' stroke-width="2.3"/><path d="M17.5 4.2 21.5 7.5l-4 3.3zM17.5 13.2l4 3.3-4 3.3z"/>'),
    bulb: S('<path d="M12 2.5a6.5 6.5 0 0 0-3.6 11.9c.7.5 1.1 1.2 1.1 2V17h5v-.6c0-.8.4-1.5 1.1-2A6.5 6.5 0 0 0 12 2.5z"/><rect x="9.5" y="18.4" width="5" height="2.1" rx="1"/><rect x="10.4" y="21" width="3.2" height="1.5" rx=".7"/>'),
    plane: S('<path d="M22 2 2 10l7.4 3L12 22l3-6.6 4.6 2.6z"/>'),
    video: S('<rect x="2.5" y="6" width="13" height="12" rx="2.6"/><path d="M16.5 10.6l5-3.1v9l-5-3.1z"/>'),
    restart: S('<path d="M20 12a8 8 0 1 1-2.5-5.8M20.5 3.8v5.2h-5.2" ' + STROKE + ' stroke-width="2.6"/>'),
    home: S('<path d="M3 11.2 12 3l9 8.2V21h-6v-6H9v6H3z"/>'),
    map: S('<path d="M3 6l6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5z"/>'),
  };
  const icon = (name) => h('span', { html: ICON[name], style: 'display:contents' });
  const STAR_PTS = '12,2 15.1,8.6 22.3,9.5 17,14.5 18.4,21.7 12,18.2 5.6,21.7 7,14.5 1.7,9.5 8.9,8.6';
  const starSvg = (on) => '<svg class="star ' + (on ? 'star-on' : 'star-off') + '" viewBox="0 0 24 24"><polygon points="' + STAR_PTS + '"/></svg>';
  function starsRow(n, cls) { return h('span', { class: cls || 'stars', html: [0, 1, 2].map((i) => starSvg(i < n)).join('') }); }

  // ====================================================================== assets
  function assetUrl(p) { return (window.__ASSETS && window.__ASSETS[p]) || ('assets/' + p); }
  const images = {};
  function loadImage(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = assetUrl(path);
      images[path] = img;
    });
  }
  function applySkinVars() {
    const set = (name, file) => document.documentElement.style.setProperty(name, 'url("' + assetUrl('ui/' + file) + '")');
    set('--bg-game', 'bg_game.png'); set('--panel-cream', 'panel_cream.png'); set('--panel-header', 'panel_header.png');
    set('--btn-green', 'btn_green.png'); set('--btn-blue', 'btn_blue.png'); set('--btn-gray', 'btn_gray.png');
    set('--btn-red', 'btn_red.png'); set('--badge-star', 'badge_star.png');
  }
  const flagImg = (c, cls) => h('img', { alt: c.name + ' flag', src: assetUrl('flags/' + c.flag + '.svg'), class: cls, draggable: 'false' });
  const lmImg = (c, i, cls) => h('img', { alt: c.names[i], src: assetUrl(lmPath(c, i)), class: cls, draggable: 'false' });

  // ====================================================================== state (JSON in localStorage)
  const State = {
    data: null,
    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { d = null; }
      if (!d || typeof d !== 'object') d = {};
      d.currentCountryId = d.currentCountryId || START_COUNTRY;
      d.currentLevelIndex = d.currentLevelIndex >= 1 ? d.currentLevelIndex : 1;
      d.unlockedCountryIds = Array.isArray(d.unlockedCountryIds) ? d.unlockedCountryIds : [];
      d.countryProgress = Array.isArray(d.countryProgress) ? d.countryProgress : [];
      d.levelStars = Array.isArray(d.levelStars) ? d.levelStars : [];
      d.settings = Object.assign({ sound: true, haptics: true }, d.settings || {});
      d.seenTutorial = !!d.seenTutorial;
      if (!d.unlockedCountryIds.includes(START_COUNTRY)) d.unlockedCountryIds.push(START_COUNTRY);
      this.data = d;
      return d;
    },
    save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* storage blocked: play on */ } if (window.Cloud) window.Cloud.push(this.data); },
    reset() { const s = this.data && this.data.settings; try { localStorage.removeItem(SAVE_KEY); } catch (e) { } this.load(); if (s) this.data.settings = s; this.save(); },
    isUnlocked(id) { return this.data.unlockedCountryIds.includes(id); },
    unlock(id) { if (!this.isUnlocked(id)) { this.data.unlockedCountryIds.push(id); this.save(); } },
    levelsDone(id) { const p = this.data.countryProgress.find((x) => x.countryId === id); return p ? Math.min(LEVELS, p.levelsCompleted) : 0; },
    nextLevel(id) { return Math.min(LEVELS, this.levelsDone(id) + 1); },
    isComplete(id) { return this.levelsDone(id) >= LEVELS; },
    advance(id) {
      this.data.currentLevelIndex++;
      let p = this.data.countryProgress.find((x) => x.countryId === id);
      if (!p) { p = { countryId: id, levelsCompleted: 0 }; this.data.countryProgress.push(p); }
      p.levelsCompleted = Math.min(LEVELS, p.levelsCompleted + 1);
    },
    starsFor(id, n) { const e = this.data.levelStars.find((x) => x.countryId === id && x.level === n); return e ? e.stars : 0; },
    setStars(id, n, stars) {
      let e = this.data.levelStars.find((x) => x.countryId === id && x.level === n);
      if (!e) { e = { countryId: id, level: n, stars: 0 }; this.data.levelStars.push(e); }
      e.stars = Math.max(e.stars, stars);
    },
    totalStars() { return this.data.levelStars.reduce((a, e) => a + e.stars, 0); },
  };
  const MAX_STARS = COUNTRIES.length * LEVELS * 3;

  // ====================================================================== sound + haptics
  const Sfx = {
    ctx: null,
    unlock() {
      try {
        if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC(); }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* audio unavailable */ }
    },
    tone(f, d, type, v, delay, slideTo) {
      if (!this.ctx || !State.data.settings.sound) return;
      try {
        const t = this.ctx.currentTime + (delay || 0), o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v || 0.1, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(t); o.stop(t + d + 0.03);
      } catch (e) { /* ignore */ }
    },
    click() { this.tone(680, 0.05, 'triangle', 0.07); },
    swap() { this.tone(320, 0.08, 'sine', 0.08, 0, 460); },
    bad() { this.tone(170, 0.2, 'square', 0.05, 0, 105); },
    pop(combo) {
      const base = 523.25 * Math.pow(2, (Math.min(combo - 1, 7) * 2) / 12);
      this.tone(base, 0.16, 'triangle', 0.13); this.tone(base * 1.5, 0.12, 'sine', 0.06, 0.04);
    },
    whoosh() { this.tone(180, 0.3, 'sawtooth', 0.04, 0, 900); },
    smash() { this.tone(140, 0.22, 'square', 0.09, 0, 55); this.tone(900, 0.08, 'triangle', 0.06, 0.02, 300); },
    star(i) { this.tone(660 + i * 200, 0.24, 'triangle', 0.13, 0); this.tone((660 + i * 200) * 2, 0.18, 'sine', 0.05, 0.05); },
    win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.12, i * 0.12)); },
    lose() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.1, i * 0.17)); },
  };
  function buzz(p) { if (State.data.settings.haptics && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { } } }
  function unlockAudio() { Sfx.unlock(); }

  // ====================================================================== ads
  // Same contract as AdManager.cs. Browser build: a simulated ad so the full flow can be tested.
  // For real AdMob ads, wrap this page as an Android app (Capacitor + AdMob plugin) and swap these methods.
  const AD_CFG = (window.APP_CONFIG && window.APP_CONFIG.admob) || {};
  const nativeAds = () => {
    try { const C = window.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.AdMob ? C.Plugins.AdMob : null; } catch (e) { return null; }
  };
  let nativeBannerOn = false, nativeInit = null;
  const Ads = window.Ads = {
    /** Real AdMob (Android app only). Falls back to the simulated ads in a browser. */
    async _native(kind) {
      const A = nativeAds(); if (!A) return null;
      try {
        if (!nativeInit) nativeInit = A.initialize({ initializeForTesting: !!AD_CFG.useTestIds });
        await nativeInit;
        if (kind === 'interstitial') {
          await A.prepareInterstitial({ adId: AD_CFG.interstitial, isTesting: !!AD_CFG.useTestIds });
          await A.showInterstitial(); return { shown: true };
        }
        let rewarded = false;
        const h1 = await A.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
        try {
          await A.prepareRewardVideoAd({ adId: AD_CFG.rewarded, isTesting: !!AD_CFG.useTestIds });
          const r = await A.showRewardVideoAd(); if (r) rewarded = true;
        } finally { try { h1.remove(); } catch (e) { } }
        return { shown: true, rewarded };
      } catch (e) { return { shown: false, rewarded: false }; }
    },
    /** Shows the native banner on the home screen and in the win / out-of-moves popups, hides it elsewhere. */
    async syncBanner() {
      const A = nativeAds(); if (!A) return;
      const want = !$('screen-home').hidden || !!document.querySelector('#modalRoot .ad-banner');
      if (want === nativeBannerOn) return;
      nativeBannerOn = want;
      try {
        if (want) {
          if (!nativeInit) nativeInit = A.initialize({ initializeForTesting: !!AD_CFG.useTestIds });
          await nativeInit;
          await A.showBanner({ adId: AD_CFG.banner, adSize: 'BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: !!AD_CFG.useTestIds });
        } else await A.hideBanner();
      } catch (e) { nativeBannerOn = false; }
    },
    _show(title, seconds, rewarded) {
      return new Promise((resolve) => {
        const ov = $('adOverlay'), cd = $('adCountdown'), claim = $('adClaim'), skip = $('adSkip'), prog = $('adProgress');
        $('adTitle').textContent = title;
        $('adReward').textContent = rewarded ? 'Reward: +' + REWARD_MOVES + ' moves' : '';
        prog.style.transition = 'none'; prog.style.width = '0'; void prog.offsetWidth;
        prog.style.transition = 'width ' + seconds + 's linear'; prog.style.width = '100%';
        claim.hidden = true; skip.hidden = false;
        skip.textContent = rewarded ? 'Close (no reward)' : 'Skip';
        skip.disabled = !rewarded;
        let left = seconds, timer = null, done = false;
        const finish = (granted) => { if (done) return; done = true; clearInterval(timer); ov.hidden = true; resolve(granted); };
        const tick = () => {
          cd.textContent = left > 0 ? (rewarded ? 'Reward in ' : 'Continue in ') + left + 's' : (rewarded ? 'Reward ready' : '');
          if (left <= 0) {
            clearInterval(timer);
            if (rewarded) { claim.hidden = false; claim.textContent = 'Claim +' + REWARD_MOVES + ' moves'; }
            else { skip.disabled = false; skip.textContent = 'Continue'; }
          }
          left--;
        };
        claim.onclick = () => finish(true);
        skip.onclick = () => finish(false);
        ov.hidden = false;
        tick(); timer = setInterval(tick, 1000);
      });
    },
    /** Simulated banner (320x50 slot). With real AdMob this becomes a banner view shown over the popup. */
    banner() {
      if (nativeAds()) return h('div', { class: 'ad-banner ad-banner-native', 'aria-hidden': 'true' });
      return h('div', { class: 'ad-banner', role: 'complementary', 'aria-label': 'Advertisement' },
        h('span', { class: 'ad-banner-tag', text: 'Ad' }),
        h('div', { class: 'ad-banner-body' }, h('b', { text: 'Test banner ad' }), h('small', { text: 'Your AdMob banner shows here' })));
    },
    async showCountryGate(name) {
      Track.event('ad_gate_shown', { country: name });
      if (nativeAds()) { await this._native('interstitial'); return false; }
      return this._show('Travelling to ' + name + '...', 3, false);
    },
    async showRewarded() {
      Track.event('rewarded_ad_started', { country: Game.country && Game.country.id, level: Game.levelNo });
      let ok;
      if (nativeAds()) { const r = await this._native('rewarded'); ok = !!(r && r.rewarded); if (r && !r.shown) toast('No ad available right now. Try again in a moment.'); }
      else ok = await this._show('Extra moves', 4, true);
      if (ok) Track.event('rewarded_ad_completed', { country: Game.country && Game.country.id, level: Game.levelNo });
      return ok;
    },
  };

  // ====================================================================== UI helpers
  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._h); toast._h = setTimeout(() => { t.hidden = true; }, ms || 2200);
  }
  function announce(msg) { $('srLive').textContent = msg; }

  function show(screen) {
    for (const s of ['home', 'map', 'game']) $('screen-' + s).hidden = s !== screen;
    closeModal();
    if (screen === 'game') startLoop();
    Ads.syncBanner();
  }

  function btn(label, cls, onClick, extra) {
    return h('button', { type: 'button', class: 'btn ' + cls, onclick: onClick }, extra || null, label);
  }
  function openModal(card, opts) {
    const root = $('modalRoot'); root.innerHTML = '';
    const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true' }, card);
    if (!opts || opts.dismiss !== false) ov.addEventListener('pointerdown', (e) => { if (e.target === ov) closeModal(); });
    root.append(ov);
    Game.modalOpen = true; Game.modalLock = !!(opts && opts.dismiss === false);
    Ads.syncBanner();
    const first = card.querySelector('button'); if (first) { try { first.focus({ preventScroll: true }); } catch (e) { } }
    return ov;
  }
  function closeModal() { $('modalRoot').innerHTML = ''; Game.modalOpen = false; if (window.Ads) window.Ads.syncBanner(); }
  const cardEl = (...kids) => h('div', { class: 'modal-card panel-cream' }, kids);

  // ====================================================================== home
  function playTarget() {
    const start = Math.max(0, COUNTRIES.findIndex((c) => c.id === State.data.currentCountryId));
    for (let k = 0; k < COUNTRIES.length; k++) {
      const c = COUNTRIES[(start + k) % COUNTRIES.length];
      if (State.isUnlocked(c.id) && !State.isComplete(c.id)) return { country: c, level: State.nextLevel(c.id) };
    }
    return null;
  }
  function starsChipContent() { return [h('span', { html: starSvg(true), style: 'display:contents' }), State.totalStars() + ' / ' + MAX_STARS]; }
  function renderHome() {
    const hero = $('homeHero'); hero.innerHTML = '';
    COUNTRIES.slice(0, 6).forEach((c) => hero.append(lmImg(c, 0)));
    const hb = $('homeBanner'); hb.innerHTML = ''; hb.append(Ads.banner());
    const t = playTarget();
    $('playSub').textContent = t ? t.country.name + ' · Level ' + t.level : 'All countries complete';
    for (const id of ['homeStars']) { const el = $(id); el.innerHTML = ''; el.append(...starsChipContent()); }
  }
  function goHome() { show('home'); renderHome(); }
  function onPlay() {
    const t = playTarget();
    if (!t) { goMap(); return; }
    State.data.currentCountryId = t.country.id; State.save();
    openPreLevel(t.country, t.level);
  }

  // ====================================================================== map
  let mapFilter = '';
  function goMap() { show('map'); const q = $('mapSearch'); q.value = ''; mapFilter = ''; renderMap(); }

  function renderMap() {
    const box = $('nodes'); box.innerHTML = '';
    const ms = $('mapStars'); ms.innerHTML = ''; ms.append(...starsChipContent());
    const cur = playTarget();
    let curNode = null;

    const shown = COUNTRIES.filter((c) => !mapFilter || c.name.toLowerCase().includes(mapFilter));
    if (!shown.length) box.append(h('p', { class: 'map-empty', text: 'No country found' }));
    shown.forEach((c) => {
      const unlocked = State.isUnlocked(c.id), done = State.levelsDone(c.id), complete = State.isComplete(c.id);
      const isCur = !!cur && cur.country.id === c.id;
      const ring = h('span', { class: 'node-ring', style: '--p:' + Math.round((done / LEVELS) * 100) },
        h('span', { class: 'node-disc' }, c.generic ? flagImg(c, 'node-flag') : lmImg(c, 0)));
      const sub = !unlocked ? 'Watch an ad to unlock' : complete ? 'Complete' : 'Level ' + (done + 1) + ' of ' + LEVELS;
      const node = h('button', {
        type: 'button', class: 'node' + (unlocked ? '' : ' locked') + (isCur && unlocked ? ' current' : ''), 'data-id': c.id,
        'aria-label': c.name + '. ' + sub, onclick: () => onCountry(c),
      }, ring,
        !unlocked ? h('span', { class: 'node-lock', html: ICON.lock }) : complete ? h('span', { class: 'node-done', html: ICON.check }) : null,
        h('span', { class: 'node-label' }, h('b', { text: c.name }), h('small', { text: sub })));
      if (isCur) curNode = node;
      box.append(node);
    });

    requestAnimationFrame(() => {
      drawRoute();
      const sc = $('mapScroll');
      if (curNode && !mapFilter) sc.scrollTop = Math.max(0, curNode.offsetTop - sc.clientHeight / 2 + curNode.offsetHeight / 2);
    });
  }

  function drawRoute() {
    const route = $('route'), svg = $('routeSvg'), nodes = [...document.querySelectorAll('#nodes .node')];
    if (!nodes.length || route.hidden) return;
    const rr = route.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + rr.width + ' ' + rr.height);
    const pts = nodes.map((n) => {
      const r = n.querySelector('.node-ring').getBoundingClientRect();
      return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2, id: n.getAttribute('data-id') };
    });
    let out = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], my = (a.y + b.y) / 2;
      const done = State.isComplete(a.id);
      out += '<path d="M' + a.x + ' ' + a.y + ' C' + a.x + ' ' + my + ' ' + b.x + ' ' + my + ' ' + b.x + ' ' + b.y + '" fill="none" stroke="' +
        (done ? '#ffd25a' : 'rgba(255,255,255,.75)') + '" stroke-width="' + (done ? 7 : 6) + '" stroke-linecap="round" stroke-dasharray="1 16"/>';
    }
    svg.innerHTML = out;

    const plane = $('plane'), cur = nodes.find((n) => n.classList.contains('current')) || nodes[0];
    const pi = nodes.indexOf(cur), p = pts[pi];
    plane.innerHTML = ICON.plane;
    plane.style.left = (p.x + (pi % 2 === 0 ? 62 : -108)) + 'px';
    plane.style.top = (p.y - 52) + 'px';
  }

  async function onCountry(c) {
    if (!State.isUnlocked(c.id)) {
      await Ads.showCountryGate(c.name);       // a closed or failed ad never blocks the player
      State.unlock(c.id); State.save();
      Track.event('country_unlocked', { country: c.id });
      renderMap();
    }
    openCountrySheet(c);
  }

  function openCountrySheet(c) {
    const done = State.levelsDone(c.id), complete = State.isComplete(c.id);
    const stars = Array.from({ length: LEVELS }, (_, i) => State.starsFor(c.id, i + 1)).reduce((a, b) => a + b, 0);
    const grid = h('div', { class: 'pad-grid' });
    for (let n = 1; n <= LEVELS; n++) {
      const open = n <= done + 1, isCur = n === done + 1 && !complete;
      const pad = h('button', {
        type: 'button', class: 'pad' + (isCur ? ' current' : '') + (open ? '' : ' locked') + ((n - 1) % BONUS_EVERY === 0 && n > 1 ? ' hard' : ''),
        'aria-label': 'Level ' + n + (open ? ', ' + State.starsFor(c.id, n) + ' stars' : ', locked'),
        onclick: open ? () => openPreLevel(c, n) : () => toast('Clear level ' + (n - 1) + ' to unlock this one'),
      }, open ? [h('span', { class: 'num', text: n }), starsRow(State.starsFor(c.id, n))] : h('span', { html: ICON.lock }));
      grid.append(pad);
    }
    const next = COUNTRIES[COUNTRIES.indexOf(c) + 1];
    const card = cardEl(
      h('p', { class: 'eyebrow', text: complete ? 'Country complete' : done + ' of ' + LEVELS + ' levels cleared' }),
      h('div', { class: 'sheet-head' }, flagImg(c, 'sheet-flag'), h('h2', { text: c.name })),
      h('div', { class: 'lm-row' }, c.files.map((_, i) => lmImg(c, i))),
      grid,
      h('p', { class: 'legend', html: '' }, '+2 marks levels that give 2 more moves than the one before. Stars earned: ' + stars + ' / ' + LEVELS * 3),
      h('div', { class: 'modal-stack' },
        complete && next ? btn('Next: ' + next.name, 'btn-green', () => { closeModal(); onCountry(next); }) : null,
        !complete ? btn('Play level ' + (done + 1), 'btn-green', () => openPreLevel(c, done + 1)) : null,
        btn('Close', 'btn-gray', closeModal)));
    openModal(card);
  }

  // ====================================================================== pre-level
  function openPreLevel(c, n) {
    const p = levelParams(n), best = State.starsFor(c.id, n);
    const card = cardEl(
      h('p', { class: 'eyebrow', text: c.name }),
      h('h2', { text: 'Level ' + n }),
      h('div', { class: 'big-stars', style: 'font-size:34px' }, [0, 1, 2].map((i) => h('span', { class: 'stars', html: starSvg(i < best) }))),
      h('div', { class: 'chips' },
        h('div', { class: 'goal-chip' }, h('small', { text: 'Reach' }), h('b', { text: p.target.toLocaleString() })),
        h('div', { class: 'goal-chip' }, h('small', { text: 'Moves' }), h('b', { text: p.moves }))),
      h('div', { class: 'lm-row' }, c.files.map((_, i) => lmImg(c, i))),
      h('p', { class: 'note', text: (n - 1) % BONUS_EVERY === 0 && n > 1 ? 'Tougher level, but you get 2 more moves.' : 'Match 3 or more of the same landmark.' }),
      h('div', { class: 'modal-stack' },
        btn('Start', 'btn-green', () => beginLevel(c, n)),
        btn('Back', 'btn-gray', () => { closeModal(); }))
    );
    openModal(card);
  }

  // ====================================================================== game state
  const Game = {
    country: null, levelNo: 1, t: null, sprites: [], moves: 0, startMoves: 0, score: 0, target: 0, rewardsUsed: 0,
    busy: false, over: true, modalLock: false, selected: null, cursor: null, kb: false, hammer: false, hint: null, lastAction: 0,
    boosters: { hammer: 0, shuffle: 0, hint: 0 }, modalOpen: false,
    cells: [], particles: [], cell: 48, pad: 0, dpr: 1, canvas: null, ctx: null,
  };
  const mk = (type, x, y) => ({ type, x, y, scale: 1, alpha: 1, ox: 0, oy: 0 });
  const gridCells = (t) => t.map((row, r) => row.map((type, c) => mk(type, c, r)));

  function beginLevel(c, n) {
    const p = levelParams(n);
    Game.country = c; Game.levelNo = n; Game.moves = Game.startMoves = p.moves; Game.target = p.target;
    Game.score = 0; Game.rewardsUsed = 0; Game.busy = true; Game.over = false; Game.selected = null; Game.hammer = false;
    Game.hint = null; Game.kb = false; Game.cursor = { r: 3, c: 3 }; Game.particles = [];
    Game.boosters = Object.assign({}, BOOSTERS);
    Game.t = Core.randomBoard(ROWS, COLS, 6);
    Game.cells = gridCells(Game.t);
    Game.sprites = c.files.map((_, i) => images[lmPath(c, i)]);
    State.data.currentCountryId = c.id; State.save();
    Track.event('level_start', { country: c.id, level: n });

    $('levelText').textContent = 'LEVEL ' + n + ' / ' + LEVELS;
    $('countryText').textContent = c.name;
    $('coach').hidden = true;
    show('game');
    layout(); updateHud(); renderBoosters(); syncSoundButtons();
    announce('Level ' + n + ', ' + c.name + '. Reach ' + p.target + ' points in ' + p.moves + ' moves.');
    intro().then(() => {
      Game.busy = false; Game.lastAction = performance.now();
      if (!State.data.seenTutorial) {
        $('coach').textContent = 'Swipe a tile to swap it. Match 3 or more!';
        $('coach').hidden = false;
        Game.hint = pickMove();
      }
    });
  }

  async function intro() {
    if (RM) return;
    const all = []; Game.cells.forEach((row) => row.forEach((o) => all.push(o)));
    const base = all.map((o) => o.y);
    all.forEach((o, i) => { o.y = base[i] - (ROWS + 2); });
    Sfx.whoosh();
    await animate(720, (k) => {
      all.forEach((o, i) => {
        const r = Math.floor(i / COLS), c = i % COLS;
        const delay = c * 0.05 + (ROWS - 1 - r) * 0.025;
        o.y = base[i] - (1 - easeOut(clamp01((k - delay) / 0.45))) * (ROWS + 2);
      });
    });
    all.forEach((o, i) => { o.y = base[i]; });
  }

  function updateHud() {
    const m = $('movesText'); m.textContent = Game.moves;
    $('movesBadge').classList.toggle('low', Game.moves <= 3 && Game.moves > 0);
    $('scoreText').textContent = Game.score.toLocaleString();
    $('goalText').textContent = Game.score.toLocaleString() + ' / ' + Game.target.toLocaleString();
    $('goalFill').style.width = Math.min(100, (Game.score / Game.target) * 100) + '%';
  }
  function bump(id) { const el = $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  function renderBoosters() {
    const box = $('boosters'); box.innerHTML = '';
    const defs = [['hammer', 'Hammer', 'hammer'], ['shuffle', 'Shuffle', 'shuffle'], ['hint', 'Hint', 'bulb']];
    defs.forEach(([key, label, ic]) => {
      const n = Game.boosters[key];
      const b = h('button', {
        type: 'button', class: 'booster' + (n <= 0 ? ' empty' : '') + (key === 'hammer' && Game.hammer ? ' active' : ''), 'data-b': key,
        'aria-label': label + ', ' + n + ' left', onclick: () => useBooster(key),
      }, h('span', { class: 'booster-disc', html: ICON[ic] }), h('span', { class: 'booster-count', text: n }), h('span', { class: 'booster-name', text: label }));
      box.append(b);
    });
    $('board').classList.toggle('hammer', Game.hammer);
  }

  // ---------------------------------------------------------------- layout / drawing
  function layout() {
    const wrap = $('boardWrap'), cv = Game.canvas;
    const w = wrap.clientWidth, hgt = wrap.clientHeight - 4;
    const frame = 0.4583;                       // 44px frame on a 96px cell in the art
    const uw = COLS + frame * 2, uh = ROWS + frame * 2;
    const cell = Math.max(24, Math.floor(Math.min(w / uw, hgt / uh)));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    Game.cell = cell; Game.pad = cell * frame; Game.dpr = dpr;
    const cw = Math.round(cell * uw), ch = Math.round(cell * uh);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    Game.ctx = cv.getContext('2d');
  }

  let looping = false, lastT = 0;
  function startLoop() { if (looping) return; looping = true; lastT = performance.now(); requestAnimationFrame(loop); }
  function loop(now) {
    if ($('screen-game').hidden) { looping = false; return; }
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    updateParticles(dt);
    if (!Game.hint && !Game.busy && !Game.over && !Game.modalOpen && !Game.hammer && now - Game.lastAction > IDLE_HINT_MS) Game.hint = pickMove();
    draw(now);
    requestAnimationFrame(loop);
  }

  function roundRect(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw(now) {
    const ctx = Game.ctx; if (!ctx || !Game.cells.length) return;
    const { cell, pad, dpr } = Game;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = cell * (COLS + 0.9166), ch = cell * (ROWS + 0.9166);
    ctx.clearRect(0, 0, cw, ch);
    const boardImg = images['ui/board.png'];
    if (boardImg) ctx.drawImage(boardImg, 0, 0, cw, ch); else { ctx.fillStyle = '#6b3f1a'; ctx.fillRect(0, 0, cw, ch); }

    const hint = Game.hint, wob = Math.sin(now / 170);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const o = Game.cells[r] && Game.cells[r][c]; if (!o) continue;
      let dx = 0, dy = 0, sc = 1;
      if (hint && !Game.busy) {
        const isA = hint.a.r === r && hint.a.c === c, isB = hint.b.r === r && hint.b.c === c;
        if (isA || isB) {
          const o2 = isA ? hint.b : hint.a;
          dx = (o2.c - c) * 0.1 * wob; dy = (o2.r - r) * 0.1 * wob; sc = 1 + 0.06 * (wob + 1) / 2;
        }
      }
      drawTile(ctx, o, dx, dy, sc);
    }

    const sel = Game.selected, kb = Game.kb && Game.cursor;
    const ring = (cellRC, col, w) => {
      const o = Game.cells[cellRC.r] && Game.cells[cellRC.r][cellRC.c]; if (!o) return;
      const x = pad + o.x * cell, y = pad + o.y * cell;
      ctx.save(); ctx.lineWidth = w * Math.max(2, cell * 0.06); ctx.strokeStyle = col;
      ctx.shadowColor = 'rgba(255,230,120,0.9)'; ctx.shadowBlur = cell * 0.25;
      roundRect(ctx, x + cell * 0.04, y + cell * 0.04, cell * 0.92, cell * 0.92, cell * 0.16); ctx.stroke(); ctx.restore();
    };
    if (sel) ring(sel, 'rgba(255,255,255,0.97)', 1);
    if (kb && !Game.busy) ring(Game.cursor, 'rgba(255,214,90,0.95)', 0.8);

    for (const p of Game.particles) {
      ctx.save(); ctx.globalAlpha = clamp01(p.life / p.max); ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
    }
  }

  function drawTile(ctx, o, dx, dy, extraScale) {
    const { cell, pad } = Game;
    if (o.alpha <= 0 || o.scale <= 0) return;
    const size = cell * 0.96 * o.scale * (extraScale || 1);
    const cx = pad + (o.x + o.ox + dx + 0.5) * cell, cy = pad + (o.y + o.oy + dy + 0.5) * cell;
    const img = Game.sprites[o.type];
    ctx.save(); ctx.globalAlpha = o.alpha;
    if (img) ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    else { ctx.fillStyle = TILE_BG[o.type % TILE_BG.length]; roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.25); ctx.fill(); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- particles
  function emit(r, c, type, n) {
    if (RM) return;
    const { cell, pad } = Game, x = pad + (c + 0.5) * cell, y = pad + (r + 0.5) * cell;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = cell * (1.2 + Math.random() * 2.6);
      Game.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - cell * 1.2, life: 0.55 + Math.random() * 0.35, max: 0.9,
        size: cell * (0.06 + Math.random() * 0.1), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        color: Math.random() < 0.4 ? '#fff6c8' : TILE_BG[type % TILE_BG.length] });
    }
  }
  function updateParticles(dt) {
    const g = Game.cell * 9;
    for (let i = Game.particles.length - 1; i >= 0; i--) {
      const p = Game.particles[i];
      p.life -= dt; if (p.life <= 0) { Game.particles.splice(i, 1); continue; }
      p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
  }

  // confetti on a full-screen canvas (win celebration)
  const Confetti = {
    parts: [], running: false,
    burst(n) {
      if (RM) return;
      const cv = $('fx'); cv.width = innerWidth; cv.height = innerHeight;
      const cols = ['#ffd25a', '#ff6b6b', '#5ad1ff', '#7cf08a', '#c08bff', '#fff'];
      for (let i = 0; i < n; i++) this.parts.push({ x: Math.random() * cv.width, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 260,
        w: 6 + Math.random() * 6, hh: 10 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, c: cols[i % cols.length], life: 3.2 });
      if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame((t) => this.tick(t)); }
    },
    tick(now) {
      const cv = $('fx'), ctx = cv.getContext('2d'), dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i]; p.life -= dt;
        if (p.life <= 0 || p.y > cv.height + 30) { this.parts.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(now / 300 + i) * 40) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = clamp01(p.life); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.hh / 2, p.w, p.hh); ctx.restore();
      }
      if (this.parts.length) requestAnimationFrame((t) => this.tick(t)); else { this.running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
    },
  };

  // ---------------------------------------------------------------- floating text
  function floatText(cx, cy, text, caption) {
    const cv = Game.canvas, host = $('floats');
    const el = h('div', { class: 'float', style: 'left:' + (cv.offsetLeft + Game.pad + (cx + 0.5) * Game.cell) + 'px;top:' + (cv.offsetTop + Game.pad + (cy + 0.5) * Game.cell) + 'px' }, text, caption ? h('small', { text: caption }) : null);
    host.append(el); setTimeout(() => el.remove(), 1100);
  }
  function praise(text) {
    const el = $('praise'); el.textContent = text; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }
  function shake() { if (RM) return; const b = $('board'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }

  // ---------------------------------------------------------------- animation
  function animate(duration, step) {
    return new Promise((resolve) => {
      const t0 = performance.now(), d = T(duration);
      (function frame(now) {
        const k = d <= 0 ? 1 : Math.min(1, (now - t0) / d);
        step(k);
        if (k < 1) requestAnimationFrame(frame); else resolve();
      })(t0);
    });
  }

  async function animateSwap(a, b) {
    const A = Game.cells[a.r][a.c], B = Game.cells[b.r][b.c];
    const ax = A.x, ay = A.y, bx = B.x, by = B.y;
    await animate(170, (k) => {
      const e = ease(k);
      A.x = ax + (bx - ax) * e; A.y = ay + (by - ay) * e;
      B.x = bx + (ax - bx) * e; B.y = by + (ay - by) * e;
    });
    Game.cells[a.r][a.c] = B; Game.cells[b.r][b.c] = A;
    B.x = a.c; B.y = a.r; A.x = b.c; A.y = b.r;
  }

  async function wiggle(a, b) {
    const A = Game.cells[a.r][a.c], B = Game.cells[b.r][b.c];
    const dx = (b.c - a.c) * 0.12, dy = (b.r - a.r) * 0.12;
    await animate(260, (k) => {
      const s = Math.sin(k * Math.PI * 3) * (1 - k);
      A.ox = dx * s; A.oy = dy * s; B.ox = -dx * s; B.oy = -dy * s;
    });
    A.ox = A.oy = B.ox = B.oy = 0;
  }

  // ---------------------------------------------------------------- input
  let down = null;
  const inBounds = (c) => c && c.r >= 0 && c.c >= 0 && c.r < ROWS && c.c < COLS;
  function cellAt(ev) {
    const rect = Game.canvas.getBoundingClientRect();
    const c = Math.floor((ev.clientX - rect.left - Game.pad) / Game.cell), r = Math.floor((ev.clientY - rect.top - Game.pad) / Game.cell);
    return inBounds({ r, c }) ? { r, c } : null;
  }
  const adjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

  function playerActed() { Game.hint = null; Game.lastAction = performance.now(); Game.kb = false; }

  function onPointerDown(ev) {
    unlockAudio();
    if (Game.busy || Game.over || Game.modalOpen) return;
    ev.preventDefault(); playerActed();
    const cell = cellAt(ev); if (!cell) return;
    down = { cell, x: ev.clientX, y: ev.clientY, fired: false };
    try { Game.canvas.setPointerCapture(ev.pointerId); } catch (e) { }
  }
  function onPointerMove(ev) {
    if (!down || down.fired || Game.busy || Game.over || Game.hammer) return;
    const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
    if (Math.hypot(dx, dy) < Math.max(14, Game.cell * 0.35)) return;
    down.fired = true;
    const dir = Math.abs(dx) > Math.abs(dy) ? { r: 0, c: dx > 0 ? 1 : -1 } : { r: dy > 0 ? 1 : -1, c: 0 };
    const target = { r: down.cell.r + dir.r, c: down.cell.c + dir.c };
    Game.selected = null;
    if (inBounds(target)) attemptSwap(down.cell, target);
  }
  function onPointerUp() {
    if (!down) return;
    const d = down; down = null;
    if (d.fired || Game.busy || Game.over) return;
    if (Game.hammer) { useHammer(d.cell); return; }
    const sel = Game.selected;
    if (!sel) Game.selected = d.cell;
    else if (sel.r === d.cell.r && sel.c === d.cell.c) Game.selected = null;
    else if (adjacent(sel, d.cell)) { Game.selected = null; attemptSwap(sel, d.cell); }
    else Game.selected = d.cell;
  }

  function onKey(ev) {
    if (ev.key === 'Escape' && !$('screen-map').hidden && !Game.modalOpen) { goHome(); return; }
    if ($('screen-game').hidden) return;
    if (ev.key === 'Escape') { if (Game.modalOpen) { if (!Game.modalLock) closeModal(); } else if (!Game.over) openPause(); return; }
    if (Game.modalOpen || Game.busy || Game.over) return;
    const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (dirs[ev.key]) {
      ev.preventDefault(); unlockAudio(); playerActed(); Game.kb = true;
      const [dr, dc] = dirs[ev.key], cur = Game.cursor;
      if (Game.selected) { const t = { r: Game.selected.r + dr, c: Game.selected.c + dc }; const from = Game.selected; Game.selected = null; if (inBounds(t)) { Game.cursor = t; attemptSwap(from, t); } }
      else { const t = { r: cur.r + dr, c: cur.c + dc }; if (inBounds(t)) Game.cursor = t; }
    } else if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault(); unlockAudio(); playerActed(); Game.kb = true;
      if (Game.hammer) useHammer(Game.cursor);
      else Game.selected = Game.selected ? null : { r: Game.cursor.r, c: Game.cursor.c };
    }
  }

  // ---------------------------------------------------------------- core loop
  function listMoves() {
    const out = [], t = Game.t;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      for (const b of [{ r, c: c + 1 }, { r: r + 1, c }]) {
        if (b.r >= ROWS || b.c >= COLS) continue;
        const a = { r, c };
        Core.swapCells(t, a, b);
        const ok = Core.findMatches(t).length > 0;
        Core.swapCells(t, a, b);
        if (ok) out.push({ a, b });
      }
    }
    return out;
  }
  function pickMove() { const m = listMoves(); return m.length ? m[Math.floor(Math.random() * m.length)] : null; }

  async function attemptSwap(a, b) {
    Game.busy = true;
    if (!State.data.seenTutorial) { State.data.seenTutorial = true; State.save(); $('coach').hidden = true; }
    Sfx.swap();
    await animateSwap(a, b);
    Core.swapCells(Game.t, a, b);

    if (Core.findMatches(Game.t).length === 0) {      // illegal swap: undo, no move spent
      Sfx.bad(); buzz(25);
      await animateSwap(a, b);
      Core.swapCells(Game.t, a, b);
      await wiggle(a, b);
      Game.busy = false; Game.lastAction = performance.now();
      return;
    }

    Game.moves--; updateHud(); bump('movesText');
    await resolveCascades();
    await afterBoardSettles();
  }

  async function afterBoardSettles() {
    if (!Game.over && !Core.hasMove(Game.t)) { await doShuffle(false); toast('No moves left, so the board was shuffled'); }
    announce('Score ' + Game.score + '. ' + Game.moves + ' moves left.');
    checkEnd();
    Game.busy = false; Game.lastAction = performance.now();
  }

  async function resolveCascades() {
    let combo = 1;
    for (;;) {
      const matches = Core.findMatches(Game.t);
      if (!matches.length) break;
      const gain = matches.length * 20 * combo;
      Game.score += gain; updateHud(); bump('scoreText');

      // where to show the points, and which landmark was matched most
      let sr = 0, sc = 0; const counts = {};
      matches.forEach((m) => { sr += m.r; sc += m.c; const ty = Game.t[m.r][m.c]; counts[ty] = (counts[ty] || 0) + 1; });
      const topType = Object.keys(counts).sort((x, y) => counts[y] - counts[x])[0];
      floatText(sc / matches.length, sr / matches.length, '+' + gain, Game.country.names[topType]);
      if (combo >= 2) praise(['', '', 'Nice!', 'Great!', 'Awesome!'][Math.min(combo, 4)] || 'Incredible!');
      else if (matches.length >= 5) praise('Sweet!');
      if (combo >= 3) shake();
      Sfx.pop(combo); buzz(combo >= 3 ? [14, 24, 14] : 10);

      const objs = matches.map((m) => Game.cells[m.r][m.c]);
      matches.forEach((m) => emit(m.r, m.c, Game.t[m.r][m.c], 7));
      await animate(170, (k) => { for (const o of objs) { o.scale = 1 + 0.18 * Math.sin(k * Math.PI) - ease(k); o.alpha = 1 - k * k; } });
      for (const m of matches) { Game.t[m.r][m.c] = -1; Game.cells[m.r][m.c] = null; }
      await applyGravity();
      combo++;
    }
  }

  async function applyGravity() {
    const newT = Game.t.map((row) => row.map(() => -1)), newCells = Game.t.map((row) => row.map(() => null)), movers = [];
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const o = Game.cells[r][c]; if (!o) continue;
        newT[write][c] = Game.t[r][c]; newCells[write][c] = o;
        if (write !== r) movers.push({ o, from: o.y, to: write });
        write--;
      }
      for (let r = write, k = 0; r >= 0; r--, k++) {
        const type = Math.floor(Math.random() * 6), o = mk(type, c, -1 - k);
        newT[r][c] = type; newCells[r][c] = o; movers.push({ o, from: o.y, to: r });
      }
    }
    Game.t = newT; Game.cells = newCells;
    const maxDist = movers.reduce((m, mv) => Math.max(m, mv.to - mv.from), 1);
    await animate(170 + Math.min(280, maxDist * 48), (k) => {
      const e = easeOut(k);
      for (const mv of movers) mv.o.y = mv.from + (mv.to - mv.from) * e;
    });
    for (const mv of movers) mv.o.y = mv.to;
  }

  async function doShuffle(fromBooster) {
    Game.busy = true; Game.hint = null; Sfx.whoosh();
    const all = []; Game.cells.forEach((row) => row.forEach((o) => o && all.push(o)));
    await animate(190, (k) => { all.forEach((o) => { o.scale = 1 - ease(k); }); });
    Game.t = Core.randomBoard(ROWS, COLS, 6);
    Game.cells = gridCells(Game.t);
    Game.cells.forEach((row) => row.forEach((o) => { o.scale = 0; }));
    const fresh = []; Game.cells.forEach((row) => row.forEach((o) => fresh.push(o)));
    await animate(230, (k) => { fresh.forEach((o) => { o.scale = easeOut(k); }); });
    fresh.forEach((o) => { o.scale = 1; });
    if (fromBooster) { Game.busy = false; Game.lastAction = performance.now(); }
  }

  // ---------------------------------------------------------------- boosters
  function useBooster(kind) {
    unlockAudio();
    if (Game.busy || Game.over || Game.modalOpen) return;
    if (Game.boosters[kind] <= 0) { toast('No ' + kind + ' boosters left this level'); Sfx.bad(); return; }
    Sfx.click();
    if (kind === 'hint') {
      const mv = pickMove(); if (!mv) return;
      Game.hint = mv; Game.boosters.hint--; Game.lastAction = performance.now(); renderBoosters();
    } else if (kind === 'shuffle') {
      Game.boosters.shuffle--; renderBoosters(); doShuffle(true);
    } else if (kind === 'hammer') {
      Game.hammer = !Game.hammer; Game.selected = null; Game.hint = null; renderBoosters();
      toast(Game.hammer ? 'Tap any tile to smash it' : 'Hammer put away', 1800);
    }
  }

  async function useHammer(cell) {
    if (!cell || !Game.cells[cell.r][cell.c]) return;
    Game.busy = true; Game.hammer = false; Game.boosters.hammer--; renderBoosters();
    const o = Game.cells[cell.r][cell.c];
    Sfx.smash(); buzz([20, 20, 30]); shake();
    emit(cell.r, cell.c, Game.t[cell.r][cell.c], 14);
    Game.score += 30; updateHud(); bump('scoreText');
    await animate(150, (k) => { o.scale = 1 + 0.3 * k - k; o.alpha = 1 - k; });
    Game.t[cell.r][cell.c] = -1; Game.cells[cell.r][cell.c] = null;
    await applyGravity();
    await resolveCascades();
    await afterBoardSettles();
  }

  // ---------------------------------------------------------------- win / lose
  function starsFor(left, total) { return left >= total * 0.35 ? 3 : left >= total * 0.15 ? 2 : 1; }

  function checkEnd() {
    if (Game.score >= Game.target) {
      Game.over = true; Game.hint = null;
      const stars = starsFor(Game.moves, Game.startMoves), c = Game.country, n = Game.levelNo;
      const firstClear = n === State.levelsDone(c.id) + 1;
      State.setStars(c.id, n, stars);
      Track.event('level_win', { country: c.id, level: n, stars, moves_left: Game.moves, score: Game.score });
      if (firstClear) State.advance(c.id);
      State.save();
      setTimeout(() => showWin(stars, firstClear), T(450));
    } else if (Game.moves <= 0) {
      Game.over = true; Game.hint = null; Sfx.lose();
      Track.event('level_lose', { country: Game.country.id, level: Game.levelNo, score: Game.score, target: Game.target });
      setTimeout(showLose, T(450));
    }
  }

  function showWin(stars, firstClear) {
    if ($('screen-game').hidden) return;
    const c = Game.country, n = Game.levelNo, complete = State.isComplete(c.id) && n === LEVELS;
    const next = COUNTRIES[COUNTRIES.indexOf(c) + 1];
    Sfx.win(); buzz([30, 40, 60]); Confetti.burst(complete ? 220 : 120);

    const bs = h('div', { class: 'big-stars' }, [0, 1, 2].map((i) => h('span', { class: 'stars pending', html: starSvg(i < stars), 'data-i': i })));
    const scoreEl = h('div', { class: 'score-big', text: '0' });
    const buttons = [];
    if (complete) {
      if (next) buttons.push(btn('Next: ' + next.name, 'btn-green', () => { closeModal(); goMap(); onCountry(next); }));
      buttons.push(btn('World map', next ? 'btn-blue' : 'btn-green', goMap));
    } else {
      if (n < LEVELS) buttons.push(btn('Next level', 'btn-green', () => { closeModal(); openPreLevel(c, n + 1); }));
      buttons.push(btn('Play again', 'btn-blue', () => { closeModal(); openPreLevel(c, n); }));
      buttons.push(btn('World map', 'btn-gray', goMap));
    }
    const card = cardEl(
      h('p', { class: 'eyebrow', text: c.name + ' · Level ' + n }),
      h('h2', { text: complete ? c.name + ' complete!' : 'Level complete!' }),
      bs, scoreEl,
      h('p', { class: 'note', text: Game.moves + (Game.moves === 1 ? ' move' : ' moves') + ' left' + (firstClear ? '' : ' · replay') }),
      h('div', { class: 'modal-stack' }, buttons),
      Ads.banner());
    openModal(card, { dismiss: false });

    [...bs.children].forEach((el, i) => {
      setTimeout(() => { el.classList.remove('pending'); el.classList.add('pop'); if (i < stars) { Sfx.star(i); buzz(15); } }, T(250 + i * 330));
    });
    const t0 = performance.now(), dur = T(900);
    (function count(now) {
      const k = clamp01((now - t0) / dur); scoreEl.textContent = Math.round(Game.score * easeOut(k)).toLocaleString();
      if (k < 1 && scoreEl.isConnected) requestAnimationFrame(count);
    })(t0);
  }

  function showLose() {
    if ($('screen-game').hidden) return;
    const pct = Math.round((Game.score / Game.target) * 100), close = pct >= 80;
    const bar = h('div', { class: 'bar', style: 'margin:8px 6px 4px' }, h('div', { class: 'bar-fill', style: 'width:' + Math.min(100, pct) + '%' }));
    const buttons = [];
    if (Game.rewardsUsed < MAX_REWARDS) {
      buttons.push(btn('Watch ad: +' + REWARD_MOVES + ' moves', 'btn-green', async () => {
        closeModal();
        const earned = await Ads.showRewarded();
        if (earned) { Game.rewardsUsed++; Game.moves += REWARD_MOVES; Game.over = false; updateHud(); bump('movesText'); toast('+' + REWARD_MOVES + ' moves!'); Game.lastAction = performance.now(); }
        else showLose();
      }, h('span', { class: 'ad-tag', text: 'AD' })));
    }
    buttons.push(btn('Try again', 'btn-blue', () => { closeModal(); beginLevel(Game.country, Game.levelNo); }));
    buttons.push(btn('World map', 'btn-gray', goMap));
    openModal(cardEl(
      h('p', { class: 'eyebrow', text: Game.country.name + ' · Level ' + Game.levelNo }),
      h('h2', { text: close ? 'So close!' : 'Out of moves' }),
      bar,
      h('p', { class: 'note', text: Game.score.toLocaleString() + ' of ' + Game.target.toLocaleString() + ' points' + (Game.rewardsUsed >= MAX_REWARDS ? '. No more bonus moves this level.' : '') }),
      h('div', { class: 'modal-stack' }, buttons),
      Ads.banner()), { dismiss: false });
  }

  // ====================================================================== pause + settings
  function toggleRow(label, key) {
    const sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!State.data.settings[key]), 'aria-label': label });
    sw.onclick = () => {
      State.data.settings[key] = !State.data.settings[key]; State.save();
      sw.setAttribute('aria-checked', String(State.data.settings[key]));
      unlockAudio(); Sfx.click(); if (key === 'haptics') buzz(30); syncSoundButtons();
    };
    return h('div', { class: 'toggle-row' }, h('span', { text: label }), sw);
  }

  function openPause() {
    if (Game.over) return;
    openModal(cardEl(
      h('h2', { text: 'Paused' }),
      toggleRow('Sound', 'sound'), toggleRow('Vibration', 'haptics'),
      h('div', { class: 'modal-stack' },
        btn('Resume', 'btn-green', closeModal),
        btn('Restart level', 'btn-blue', () => { closeModal(); beginLevel(Game.country, Game.levelNo); }),
        btn('World map', 'btn-gray', goMap))));
  }

  function openSettings() {
    const reset = h('div', { style: 'text-align:center' });
    const askReset = () => {
      reset.innerHTML = '';
      reset.append(h('p', { class: 'note', text: 'Erase all progress and stars?' }),
        h('div', { class: 'modal-stack' }, btn('Yes, reset', 'btn-red', () => { State.reset(); closeModal(); renderHome(); toast('Progress reset'); }), btn('Cancel', 'btn-gray', () => { reset.innerHTML = ''; reset.append(resetLink); })));
    };
    const resetLink = h('button', { type: 'button', class: 'link-btn', text: 'Reset progress', onclick: askReset });
    reset.append(resetLink);
    openModal(cardEl(
      h('h2', { text: 'Settings' }),
      toggleRow('Sound', 'sound'), toggleRow('Vibration', 'haptics'),
      reset,
      h('div', { class: 'modal-stack' }, btn('Done', 'btn-green', closeModal))));
  }

  function leaveLevel() {
    const untouched = Game.over || (Game.score === 0 && Game.moves === Game.startMoves);
    if (untouched) { goMap(); return; }
    openModal(cardEl(
      h('h2', { text: 'Leave level?' }),
      h('p', { class: 'note', text: 'Your progress on this level will be lost.' }),
      h('div', { class: 'modal-stack' },
        btn('Keep playing', 'btn-green', closeModal),
        btn('Leave', 'btn-gray', goMap))));
  }

  function syncSoundButtons() {
    const b = $('btnSoundQuick'); if (!b) return; b.innerHTML = State.data.settings.sound ? ICON.sound : ICON.mute;
    b.setAttribute('aria-label', State.data.settings.sound ? 'Sound on' : 'Sound off');
  }

  // ====================================================================== boot
  async function boot() {
    State.load();
    applySkinVars();

    $('btnSettingsHome').innerHTML = ICON.sliders;
    $('mapBack').innerHTML = ICON.back;
    $('btnPause').innerHTML = ICON.pause;
    $('btnBack').innerHTML = ICON.back;
    syncSoundButtons();

    Game.canvas = $('board');
    Game.canvas.addEventListener('pointerdown', onPointerDown);
    Game.canvas.addEventListener('pointermove', onPointerMove);
    Game.canvas.addEventListener('pointerup', onPointerUp);
    Game.canvas.addEventListener('pointercancel', () => { down = null; });
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', unlockAudio, { once: false, passive: true });
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.btn, .icon-btn, .pad, .node')) Sfx.click(); });

    const onResize = () => { if (!$('screen-game').hidden) layout(); if (!$('screen-map').hidden) drawRoute(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 150));

    $('btnPlay').onclick = onPlay;
    $('btnWorld').onclick = goMap;
    $('mapSearch').addEventListener('input', (e) => { mapFilter = e.target.value.trim().toLowerCase(); renderMap(); $('mapScroll').scrollTop = 0; });
    $('btnSettingsHome').onclick = openSettings;
    $('mapBack').onclick = goHome;
    $('btnPause').onclick = openPause;
    $('btnBack').onclick = leaveLevel;

    const jobs = ['ui/board.png'];
    COUNTRIES.forEach((c) => c.files.forEach((_, i) => jobs.push(lmPath(c, i))));
    await Promise.all([...new Set(jobs)].map(loadImage));

    // If the display font could not load (offline, blocked), use a bold system face instead.
    const checkFonts = () => {
      try {
        const ok = [...document.fonts].some((f) => /Lilita/i.test(f.family) && f.status === 'loaded');
        document.documentElement.classList.toggle('fallback-font', !ok);
      } catch (e) { document.documentElement.classList.add('fallback-font'); }
    };
    try { document.fonts.ready.then(checkFonts); document.fonts.addEventListener('loadingdone', checkFonts); } catch (e) { checkFonts(); }

    goHome();

    // Cloud save (Firebase). If this player has more progress saved online than on this device, use the online copy.
    if (window.Cloud && window.CLOUD_ON) {
      const done = (d) => (d.countryProgress || []).reduce((a, p) => a + (p.levelsCompleted || 0), 0);
      window.Cloud.start().then((remote) => {
        if (remote && typeof remote === 'object' && done(remote) > done(State.data) && !Game.modalOpen && !$('screen-home').hidden) {
          const settings = State.data.settings;
          localStorage.setItem(SAVE_KEY, JSON.stringify(remote)); State.load(); State.data.settings = settings; State.save(); renderHome();
        } else window.Cloud.push(State.data);
      });
    }

    // Hooks for automated tests.
    window.__game = { Game, State, Core, COUNTRIES, LEVELS, beginLevel, levelParams, openPreLevel, goMap, goHome };
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
