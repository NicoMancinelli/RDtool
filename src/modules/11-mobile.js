// ===================== Task 11: Mobile Experience =====================

    function addMobileSheetBehavior(container) {
        if (!State.isMobile) return;

        // Add grab handle
        const handle = DOM.create('div', {
            style: 'width:36px; height:4px; background:var(--rd-glass-border); border-radius:2px; margin:8px auto; flex-shrink:0;'
        });
        container.insertBefore(handle, container.firstChild);

        // Swipe down to dismiss
        let startY = 0, currentY = 0, isDragging = false;
        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
        });
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                container.style.transform = 'translateY(' + diff + 'px)';
            }
        });
        document.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            const diff = currentY - startY;
            if (diff > 100) {
                UI.toggleDashboard(false);
            }
            container.style.transform = '';
        });
    }

    function addMobileLongPress(element, menuItems) {
        if (!State.isMobile) return;
        let timer;
        element.addEventListener('touchstart', (e) => {
            timer = setTimeout(() => {
                e.preventDefault();
                showMobileContextMenu(e.touches[0].clientX, e.touches[0].clientY, menuItems);
            }, 500);
        });
        element.addEventListener('touchend', () => clearTimeout(timer));
        element.addEventListener('touchmove', () => clearTimeout(timer));
    }

    function showMobileContextMenu(x, y, items) {
        // Remove existing menu
        document.querySelectorAll('.rd-mobile-context').forEach(el => el.remove());
        const menu = DOM.create('div', {
            className: 'rd-mobile-context',
            style: 'position:fixed; z-index:9999999; background:var(--rd-bg-glass); backdrop-filter:var(--rd-glass-blur); border:1px solid var(--rd-glass-border); border-radius:var(--rd-radius-md); box-shadow:var(--rd-shadow); padding:4px; min-width:160px; left:' + x + 'px; top:' + y + 'px;'
        });
        for (const item of items) {
            menu.append(DOM.create('div', {
                style: 'padding:10px 14px; font-size:13px; font-weight:500; color:var(--rd-text-primary); cursor:pointer; border-radius:var(--rd-radius-xs);',
                textContent: item.label,
                onClick: () => { menu.remove(); item.action(); },
                onTouchend: () => { menu.remove(); item.action(); }
            }));
        }
        document.body.append(menu);
        // Close on tap outside
        setTimeout(() => {
            document.addEventListener('touchstart', function handler(e) {
                if (!e.target.closest('.rd-mobile-context')) { menu.remove(); document.removeEventListener('touchstart', handler); }
            });
        }, 10);
    }

    function addPullToRefresh(scrollContainer, refreshFn) {
        if (!State.isMobile) return;
        let startY = 0, pulling = false;
        scrollContainer.addEventListener('touchstart', (e) => {
            if (scrollContainer.scrollTop === 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        });
        scrollContainer.addEventListener('touchmove', (e) => {
            if (!pulling) return;
            const diff = e.touches[0].clientY - startY;
            if (diff > 60) {
                pulling = false;
                UI.showToast('Refreshing...');
                refreshFn();
            }
        });
        scrollContainer.addEventListener('touchend', () => { pulling = false; });
    }
