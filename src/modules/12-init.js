// ===================== Task 12: Offline Resilience =====================

    function loadOfflineData(key, stateProp) {
        try {
            const cached = JSON.parse(GM_getValue(key, '[]'));
            State[stateProp] = cached;
            UI.showToast("You're offline. Showing cached data.", 'error');
            return true;
        } catch(e) { return false; }
    }

    // ===================== Task 13: Init Module + Final Wiring =====================

    const Init = {
        start() {
            UI.init();
            if (State.apiKey) {
                Scanner.init();
            }
        }
    };

    Init.start();
