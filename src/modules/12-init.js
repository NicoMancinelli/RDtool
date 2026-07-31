// ===================== Task 12: Offline Resilience =====================

function loadOfflineData(key, stateProp) {
  try {
    const cached = JSON.parse(GM_getValue(key, "[]"));
    State[stateProp] = cached;
    UI.showToast("You're offline. Showing cached data.", "error");
    return true;
  } catch (e) {
    return false;
  }
}

// ===================== Task 13: Init Module + Final Wiring =====================

const Init = {
  start() {
    try {
      UI.init();
      if (State.apiKey) {
        Scanner.init();
      }
    } catch (err) {
      console.error("[RD Suite] Init failed:", err);
      // Last-resort: show something on page so user knows script is present
      try {
        const el = document.createElement("div");
        el.id = "rd-error-banner";
        el.textContent = "RD Suite failed to load — check console (F12)";
        el.style.cssText =
          "position:fixed;bottom:10px;right:10px;z-index:9999999;background:#f28b82;color:#111;padding:10px 16px;border-radius:8px;font:12px sans-serif;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.4);";
        document.body.appendChild(el);
      } catch (_) {
        /* nothing we can do */
      }
    }
  },
};

Init.start();
