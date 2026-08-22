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

/** True when running inside an iframe / embedded frame. */
function isEmbeddedFrame() {
  try {
    return window.self !== window.top;
  } catch (_) {
    // Cross-origin access to window.top throws — treat as embedded.
    return true;
  }
}

/** Run cb once document.body exists (document-end usually already has it). */
function whenBodyReady(cb) {
  if (document.body) {
    cb();
    return;
  }
  let done = false;
  const finish = () => {
    if (done || !document.body) return;
    done = true;
    document.removeEventListener("DOMContentLoaded", finish);
    observer.disconnect();
    cb();
  };
  const observer = new MutationObserver(finish);
  observer.observe(document.documentElement, { childList: true });
  document.addEventListener("DOMContentLoaded", finish);
  setTimeout(finish, 3000);
}

/**
 * Last-resort surface when UI.init() itself throws.
 * Dismissible + auto-hide so it never nags forever on broken pages.
 */
function showInitErrorBanner(err) {
  try {
    if (document.getElementById("rd-error-banner")) return;
    const el = document.createElement("div");
    el.id = "rd-error-banner";
    el.setAttribute("role", "alert");
    el.title = err && err.message ? String(err.message) : "Init failed";
    el.textContent = "RD Suite failed to load — click to dismiss";
    el.style.cssText =
      "position:fixed;bottom:10px;right:10px;z-index:9999999;background:#f28b82;color:#111;padding:10px 16px;border-radius:8px;font:12px sans-serif;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.4);cursor:pointer;max-width:280px;";
    const dismiss = () => {
      el.remove();
    };
    el.addEventListener("click", dismiss);
    document.body.appendChild(el);
    setTimeout(dismiss, 8000);
  } catch (_) {
    /* nothing we can do */
  }
}

const Init = {
  start() {
    // Userscript also ships @noframes; this guards eval/test and older installs.
    if (isEmbeddedFrame()) return;

    whenBodyReady(() => {
      try {
        UI.init();
      } catch (err) {
        console.error("[RD Suite] Init failed:", err);
        showInitErrorBanner(err);
        return;
      }

      Updates.maybeCheckOnStartup();

      if (!State.apiKey) return;

      try {
        Scanner.init();
      } catch (err) {
        // UI already mounted — don't slap the sticky "failed to load" banner on
        // pages where only SPA/history hooks or the scanner choke.
        console.error("[RD Suite] Scanner init failed:", err);
        try {
          UI.showToast("Page scanner failed to start", "error");
        } catch (_) {
          /* UI toast unavailable */
        }
      }
    });
  },
};

// Tests set __RD_SKIP_AUTO_INIT__ before evaluating this module.
if (typeof globalThis.__RD_SKIP_AUTO_INIT__ === "undefined") {
  Init.start();
}
