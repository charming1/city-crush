// Firebase Analytics + cloud save. Does nothing until config.js has a Firebase config.
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.firebase) || {};
  const on = !!(cfg.apiKey && cfg.projectId && cfg.appId);
  const V = '10.12.2', BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';
  let fb = null, analytics = null, db = null, uid = null, pushTimer = null, queue = [];

  function load(src) {
    return new Promise((res) => {
      const s = document.createElement('script'); s.src = src; s.onload = () => res(true); s.onerror = () => res(false);
      document.head.appendChild(s);
    });
  }
  async function boot() {
    if (!on || fb !== null) return fb;
    fb = false;
    for (const f of ['app', 'analytics', 'auth', 'firestore']) { if (!(await load(BASE + 'firebase-' + f + '-compat.js'))) return false; }
    try {
      window.firebase.initializeApp(cfg);
      fb = window.firebase;
      try { analytics = fb.analytics(); } catch (e) { analytics = null; }
      db = fb.firestore();
      queue.splice(0).forEach((q) => Track.event(q[0], q[1]));
    } catch (e) { fb = false; }
    return fb;
  }

  const Track = {
    event(name, params) {
      if (!on) return;
      if (!analytics) { if (fb !== false && queue.length < 50) queue.push([name, params]); return; }
      try { analytics.logEvent(name, params || {}); } catch (e) { }
    },
  };

  const Cloud = {
    /** Signs in anonymously and returns the saved progress for this player, or null. */
    async start() {
      if (!(await boot())) return null;
      try {
        const cred = await fb.auth().signInAnonymously(); uid = cred.user.uid;
        if (analytics) analytics.setUserId(uid);
        const snap = await db.collection('players').doc(uid).get();
        return snap.exists ? JSON.parse(snap.data().progress || 'null') : null;
      } catch (e) { return null; }
    },
    /** Saves progress (at most once every few seconds). */
    push(data) {
      if (!uid || !db) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        const done = (data.countryProgress || []).reduce((a, p) => a + p.levelsCompleted, 0);
        db.collection('players').doc(uid).set({
          progress: JSON.stringify(data), levelsCompleted: done,
          updatedAt: fb.firestore.FieldValue.serverTimestamp(),
        }).catch(() => { });
      }, 3000);
    },
  };
  window.Track = Track; window.Cloud = Cloud; window.CLOUD_ON = on;
  if (on) boot();
})();
