// ==UserScript==
// @name         Real-Debrid Suite
// @namespace    http://tampermonkey.net/
// @version      38.0
// @updateURL    https://github.com/NicoMancinelli/RDtool/raw/main/dist/real-debrid-suite.user.js
// @downloadURL  https://github.com/NicoMancinelli/RDtool/raw/main/dist/real-debrid-suite.user.js
// @description  The ultimate RD tool. Liquid Glass UI, Cloud Management, Smart Magnets, PiP Media Player, Mobile Support.
// @author       Neek
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      real-debrid.com
// @run-at       document-end
// ==/UserScript==

(function() {
'use strict';

// --- Step 1: CSS via GM_addStyle ---
GM_addStyle(`:root {
            --rd-bg-base: #0a0a0a;
            --rd-bg-glass: rgba(255, 255, 255, 0.08);
            --rd-bg-glass-hover: rgba(255, 255, 255, 0.12);
            --rd-bg-glass-active: rgba(255, 255, 255, 0.06);
            --rd-glass-tint: rgba(120, 160, 255, 0.04);
            --rd-glass-blur: blur(40px) saturate(180%);
            --rd-glass-border: rgba(255, 255, 255, 0.1);
            --rd-glass-highlight: inset 0 0.5px 0 rgba(255, 255, 255, 0.12);
            --rd-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            --rd-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
            --rd-text-primary: #f0f0f0;
            --rd-text-secondary: rgba(255, 255, 255, 0.45);
            --rd-accent: #6eb1ff;
            --rd-success: #81c995;
            --rd-danger: #f28b82;
            --rd-warning: #fdd663;
            --rd-radius-lg: 14px;
            --rd-radius-md: 10px;
            --rd-radius-sm: 8px;
            --rd-radius-xs: 6px;
        }

        /* Container & FAB */
        #rd-ui-container {
            position: fixed;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            transition: all 0.3s ease;
        }
        #rd-ui-container * {
            box-sizing: border-box;
        }
        .rd-hidden {
            display: none !important;
        }
        .rd-desktop-fab {
            bottom: 30px;
            right: 30px;
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: var(--rd-bg-glass);
            backdrop-filter: var(--rd-glass-blur);
            -webkit-backdrop-filter: var(--rd-glass-blur);
            border: 1px solid var(--rd-glass-border);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--rd-text-primary);
            box-shadow: var(--rd-glass-highlight), var(--rd-shadow-sm);
            transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .rd-desktop-fab:hover {
            box-shadow: var(--rd-glass-highlight), var(--rd-shadow-sm), 0 0 20px rgba(110, 177, 255, 0.15);
            transform: scale(1.05);
        }
        .rd-mobile-fab {
            bottom: calc(20px + env(safe-area-inset-bottom));
            right: 20px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: var(--rd-bg-glass);
            backdrop-filter: var(--rd-glass-blur);
            -webkit-backdrop-filter: var(--rd-glass-blur);
            border: 1px solid var(--rd-glass-border);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--rd-text-primary);
            box-shadow: var(--rd-glass-highlight), var(--rd-shadow-sm);
            transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .rd-mobile-fab:hover {
            box-shadow: var(--rd-glass-highlight), var(--rd-shadow-sm), 0 0 20px rgba(110, 177, 255, 0.15);
            transform: scale(1.05);
        }

        /* Dashboard */
        .rd-desktop-dash {
            bottom: 30px;
            right: 30px;
            width: 400px;
            max-height: 580px;
            background: linear-gradient(135deg, var(--rd-glass-tint), var(--rd-bg-glass));
            backdrop-filter: var(--rd-glass-blur);
            -webkit-backdrop-filter: var(--rd-glass-blur);
            border-radius: var(--rd-radius-lg);
            display: flex;
            flex-direction: column;
            border: 1px solid var(--rd-glass-border);
            box-shadow: var(--rd-glass-highlight), var(--rd-shadow);
        }
        .rd-mobile-sheet {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            max-height: 85vh;
            background: var(--rd-bg-glass);
            backdrop-filter: var(--rd-glass-blur);
            -webkit-backdrop-filter: var(--rd-glass-blur);
            border-radius: var(--rd-radius-lg) var(--rd-radius-lg) 0 0;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--rd-glass-border);
            box-shadow: var(--rd-glass-highlight), var(--rd-shadow);
            transition: transform 0.3s ease;
        }

        /* Header */
        .rd-header {
            flex-shrink: 0;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(60px);
            -webkit-backdrop-filter: blur(60px);
            border-bottom: 1px solid var(--rd-glass-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 10;
        }

        /* Tabs (segmented control) */
        .rd-tabs {
            flex-shrink: 0;
            display: flex;
            padding: 4px;
            gap: 2px;
            background: rgba(255, 255, 255, 0.04);
            border-bottom: 1px solid var(--rd-glass-border);
        }
        .rd-tab {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            cursor: pointer;
            color: var(--rd-text-secondary);
            font-weight: 600;
            font-size: 11px;
            border-radius: 6px;
            transition: all 0.2s ease;
            user-select: none;
        }
        .rd-tab:hover {
            background: rgba(255, 255, 255, 0.06);
        }
        .rd-tab.active {
            background: var(--rd-bg-glass);
            color: var(--rd-accent);
            box-shadow: var(--rd-glass-highlight);
        }
        .rd-tab:active {
            background: var(--rd-bg-glass-active);
        }

        /* Content */
        .rd-content {
            flex-grow: 1;
            overflow-y: auto;
            padding: 0;
            display: flex;
            flex-direction: column;
            -webkit-overflow-scrolling: touch;
        }

        /* Control bars & inputs */
        .rd-control-bar {
            padding: 10px 14px;
            display: flex;
            gap: 10px;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--rd-glass-border);
            background: var(--rd-bg-glass);
        }
        .rd-control-group {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .rd-input-area {
            flex-shrink: 0;
            padding: 14px;
            border-bottom: 1px solid var(--rd-glass-border);
        }
        .rd-textarea {
            width: 100%;
            height: 72px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--rd-glass-border);
            color: var(--rd-text-primary);
            padding: 10px;
            resize: none;
            border-radius: var(--rd-radius-sm);
            font-size: 13px;
            font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
            outline: none;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .rd-textarea:focus {
            border-color: var(--rd-accent);
            box-shadow: 0 0 0 3px rgba(110, 177, 255, 0.15);
        }
        .rd-search-bar {
            width: 100%;
            height: auto;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--rd-glass-border);
            color: var(--rd-text-primary);
            padding: 8px 12px;
            resize: none;
            border-radius: var(--rd-radius-sm);
            font-size: 13px;
            font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
            outline: none;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .rd-search-bar:focus {
            border-color: var(--rd-accent);
            box-shadow: 0 0 0 3px rgba(110, 177, 255, 0.15);
        }
        .rd-select {
            background: var(--rd-bg-glass);
            color: var(--rd-text-primary);
            border: 1px solid var(--rd-glass-border);
            padding: 6px 10px;
            border-radius: var(--rd-radius-xs);
            font-size: 11px;
            cursor: pointer;
            outline: none;
        }

        /* Buttons */
        .rd-input-btn {
            background: var(--rd-bg-glass);
            color: var(--rd-text-primary);
            border: 1px solid var(--rd-glass-border);
            padding: 6px 12px;
            cursor: pointer;
            font-weight: 600;
            border-radius: var(--rd-radius-sm);
            font-size: 11px;
            transition: all 0.2s ease;
        }
        .rd-input-btn.primary {
            background: var(--rd-accent);
            color: #111;
            border: none;
        }
        .rd-input-btn:hover {
            background: var(--rd-bg-glass-hover);
        }
        .rd-input-btn.primary:hover {
            background: #8bc4ff;
        }
        .rd-input-btn:active {
            background: var(--rd-bg-glass-active);
        }
        .rd-input-btn.danger {
            background: var(--rd-danger);
            color: var(--rd-bg-base);
            border: none;
        }
        .rd-input-btn.danger:hover {
            background: #f5a8a0;
        }
        .rd-input-btn.success {
            background: var(--rd-success);
            color: var(--rd-bg-base);
            border: none;
        }

        /* Settings rows */
        .rd-account-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid var(--rd-glass-border);
            font-size: 12px;
        }

        /* List items (glass cards) */
        .rd-log-item {
            background: var(--rd-bg-glass);
            border-radius: var(--rd-radius-sm);
            padding: 10px;
            border: 1px solid var(--rd-glass-border);
            border-left: 2px solid transparent;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: var(--rd-shadow-sm);
            transition: background 0.2s ease;
        }
        .rd-log-item:hover {
            background: var(--rd-bg-glass-hover);
        }
        .rd-log-item.success {
            border-left-color: var(--rd-success);
        }
        .rd-log-item.error {
            border-left-color: var(--rd-danger);
        }
        .rd-log-list {
            padding: 14px;
            overflow-y: auto;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        /* Item parts */
        .rd-item-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .rd-item-actions {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .rd-filename {
            font-weight: 600;
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .rd-meta {
            display: flex;
            justify-content: space-between;
            color: var(--rd-text-secondary);
            font-size: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Action buttons */
        .rd-action-btn {
            background: rgba(255, 255, 255, 0.1);
            color: var(--rd-text-primary);
            border: none;
            padding: 4px 10px;
            border-radius: var(--rd-radius-xs);
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
            white-space: nowrap;
        }
        .rd-action-btn:hover {
            background: rgba(255, 255, 255, 0.16);
        }
        .rd-btn-group {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            align-items: center;
            margin-top: 2px;
        }

        /* Badges */
        .rd-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: var(--rd-danger);
            color: #111;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            font-size: 10px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--rd-shadow-sm);
            border: 2px solid var(--rd-bg-glass);
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        }
        .rd-badge.visible {
            opacity: 1;
        }
        .rd-dl-badge {
            display: inline;
            background: rgba(129, 201, 149, 0.1);
            color: var(--rd-success);
            border: 1px solid rgba(129, 201, 149, 0.3);
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .rd-dl-badge:hover {
            background: var(--rd-success);
            color: #111;
        }
        .rd-dl-badge.m3u {
            background: rgba(253, 214, 99, 0.1);
            color: var(--rd-warning);
            border-color: rgba(253, 214, 99, 0.3);
        }
        .rd-dl-badge.m3u:hover {
            background: var(--rd-warning);
            color: #111;
        }

        /* Toggle switch */
        .rd-toggle {
            position: relative;
            display: inline-block;
            width: 36px;
            height: 20px;
            flex-shrink: 0;
        }
        .rd-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .rd-slider {
            position: absolute;
            inset: 0;
            background: var(--rd-bg-glass);
            border: 1px solid var(--rd-glass-border);
            transition: all 0.3s ease;
            border-radius: 20px;
        }
        .rd-slider:before {
            position: absolute;
            content: '';
            width: 14px;
            height: 14px;
            left: 3px;
            bottom: 3px;
            background: var(--rd-text-secondary);
            transition: all 0.3s ease;
            border-radius: 50%;
        }
        .rd-toggle input:checked + .rd-slider {
            background: rgba(110, 177, 255, 0.3);
        }
        .rd-toggle input:checked + .rd-slider:before {
            transform: translateX(16px);
            background: var(--rd-accent);
        }

        /* Checkbox */
        .rd-checkbox {
            width: 16px;
            height: 16px;
            cursor: pointer;
            accent-color: var(--rd-accent);
            margin: 0;
            flex-shrink: 0;
        }

        /* Progress bars */
        .rd-progress-track {
            background: rgba(255, 255, 255, 0.04);
            height: 5px;
            border-radius: 3px;
            margin-top: 4px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .rd-progress-fill {
            height: 100%;
            transition: width 0.4s ease;
        }

        /* Inline icons (injected on page) */
        .rd-inline-icon {
            display: inline-flex;
            margin-left: 4px;
            cursor: pointer;
            background: rgba(129, 201, 149, 0.1);
            border: 1px solid rgba(129, 201, 149, 0.3);
            border-radius: 5px;
            padding: 0 5px;
            font-size: 11px;
            height: 18px;
            color: var(--rd-success);
            align-items: center;
            font-weight: bold;
            transition: all 0.2s ease;
            position: relative;
        }
        .rd-inline-icon:hover {
            background: var(--rd-success);
            color: #111;
            box-shadow: var(--rd-shadow-sm);
        }
        .rd-inline-icon.cached {
            background: rgba(129, 201, 149, 0.15);
            border-color: rgba(129, 201, 149, 0.4);
            color: var(--rd-success);
        }
        .rd-inline-icon.uncached {
            background: rgba(253, 214, 99, 0.1);
            border-color: rgba(253, 214, 99, 0.3);
            color: var(--rd-warning);
        }
        .rd-inline-icon.error {
            background: rgba(242, 139, 130, 0.1);
            border-color: rgba(242, 139, 130, 0.3);
            color: var(--rd-danger);
        }

        /* Tooltips */
        #rd-xray-tooltip {
            position: absolute;
            background: var(--rd-bg-glass);
            backdrop-filter: blur(60px);
            -webkit-backdrop-filter: blur(60px);
            color: var(--rd-text-primary);
            padding: 8px 12px;
            border: 1px solid var(--rd-glass-border);
            border-radius: var(--rd-radius-sm);
            z-index: 1000000;
            pointer-events: none;
            box-shadow: var(--rd-shadow);
            opacity: 0;
            transition: opacity 0.2s ease;
            white-space: nowrap;
            transform: translateY(-100%);
            margin-top: -6px;
            font-weight: 500;
            line-height: 1.4;
            font-size: 11px;
        }
        #rd-xray-tooltip.visible {
            opacity: 1;
        }
        #rd-sel-tooltip {
            position: absolute;
            z-index: 9999999;
            background: var(--rd-bg-glass);
            backdrop-filter: blur(60px);
            -webkit-backdrop-filter: blur(60px);
            color: var(--rd-accent);
            border: 1px solid var(--rd-glass-border);
            border-radius: var(--rd-radius-sm);
            padding: 6px 14px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: var(--rd-shadow);
            display: none;
            transform: translate(-50%, -100%);
            margin-top: -8px;
            transition: all 0.2s ease;
        }
        #rd-sel-tooltip.show {
            display: block;
            animation: popIn 0.2s ease forwards;
        }

        /* Toasts */
        #rd-toast-container {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        }
        .rd-toast {
            background: var(--rd-accent);
            color: #111;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            box-shadow: var(--rd-shadow);
            animation: toastIn 0.3s ease forwards;
        }
        .rd-toast.error {
            background: var(--rd-danger);
        }

        /* Modals */
        .rd-modal-overlay {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }
        .rd-modal {
            background: var(--rd-bg-base);
            border-radius: var(--rd-radius-lg);
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: var(--rd-shadow);
            border: 1px solid var(--rd-glass-border);
        }
        .rd-modal-header {
            padding: 16px;
            border-bottom: 1px solid var(--rd-glass-border);
            font-weight: bold;
            font-size: 15px;
            color: var(--rd-text-primary);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .rd-modal-content {
            padding: 16px;
            overflow-y: auto;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .rd-modal-footer {
            padding: 16px;
            border-top: 1px solid var(--rd-glass-border);
            display: flex;
            gap: 10px;
            background: var(--rd-bg-glass);
        }
        .rd-file-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 11px;
            cursor: pointer;
            border-radius: var(--rd-radius-xs);
            transition: background 0.2s ease;
        }
        .rd-file-row:hover {
            background: var(--rd-bg-glass-hover);
        }

        /* Media player */
        #rd-media-window {
            position: fixed;
            bottom: 30px;
            left: 30px;
            width: 420px;
            background: var(--rd-bg-base);
            border-radius: var(--rd-radius-lg);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
            border: 1px solid var(--rd-glass-border);
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            resize: both;
            min-width: 280px;
            min-height: 180px;
        }
        #rd-media-drag-handle {
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(60px);
            -webkit-backdrop-filter: blur(60px);
            padding: 10px 14px;
            cursor: move;
            font-weight: bold;
            font-size: 12px;
            color: var(--rd-text-primary);
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid var(--rd-glass-border);
            align-items: center;
        }
        .rd-media-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .rd-media-btn {
            cursor: pointer;
            background: var(--rd-bg-glass);
            border-radius: 50%;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            transition: background 0.2s ease;
            border: 1px solid var(--rd-glass-border);
        }
        .rd-media-btn:hover {
            background: var(--rd-bg-glass-hover);
        }
        #rd-media-window.rd-fullscreen {
            width: 100vw;
            height: 100vh;
            top: 0;
            left: 0;
            border-radius: 0;
            resize: none;
            z-index: 99999999;
        }
        #rd-media-window.rd-fullscreen #rd-media-drag-handle {
            cursor: default;
        }

        /* Drag state */
        .rd-drag-active {
            outline: 3px dashed var(--rd-accent);
            outline-offset: -4px;
            opacity: 0.9;
        }

        /* Scrollbar */
        #rd-ui-container ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        #rd-ui-container ::-webkit-scrollbar-track {
            background: transparent;
        }
        #rd-ui-container ::-webkit-scrollbar-thumb {
            background: var(--rd-glass-border);
            border-radius: 3px;
        }
        #rd-ui-container ::-webkit-scrollbar-thumb:hover {
            background: var(--rd-text-secondary);
        }

        /* Animations */
        @keyframes toastIn {
            from { transform: translateY(20px) scale(0.9); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes toastOut {
            from { transform: translateY(0) scale(1); opacity: 1; }
            to { transform: translateY(-20px) scale(0.9); opacity: 0; }
        }
        @keyframes popIn {
            0% { transform: scale(0.8) translate(-50%, -100%); opacity: 0; }
            100% { transform: scale(1) translate(-50%, -100%); opacity: 1; }
        }`);

// Config Module
    // =========================================================================

    const Config = {
        BASE_HOSTS: [
            '1fichier\\.com\\/\\?[a-z0-9]{10,10}', 'rapidgator\\.net\\/file\\/[a-z0-9]{32,32}', 'mega\\.nz\\/(file|folder|#F?!)',
            'mediafire\\.com\\/(file|folder)\\/[a-z0-9]{15,15}', 'drive\\.google\\.com\\/(file|drive|folders)\\/.+',
            'youtube\\.com\\/watch\\?v\\=[a-zA-Z0-9]{11,11}', 'turbobit\\.net\\/[a-z0-9]{12,12}', 'uploaded\\.net\\/file\\/[a-z0-9]{8,8}',
            'zippyshare\\.com\\/v\\/[a-zA-Z0-9]{8,8}\\/file', 'k2s\\.cc\\/file\\/', 'keep2share\\.cc\\/file\\/',
            'nitroflare\\.com\\/view\\/[A-Z0-9]{15,15}', 'pixeldrain\\.com\\/u\\/[a-zA-Z0-9]+', 'ddownload\\.com\\/[a-zA-Z0-9]+',
            'katfile\\.com\\/[a-zA-Z0-9]+', 'gofile\\.io\\/d\\/[a-zA-Z0-9]+', 'qiwi\\.gg\\/file\\/[a-zA-Z0-9\\-]+'
        ],

        defaultSettings: {
            hijack: false,
            autoShow: true,
            magnetAction: 'smart',
            filterExts: 'nfo, txt, url, jpg, png, md, srt',
            smartFilter: false,
            autoCleanup: false,
            defaultAction: 'dl',
            extPlayer: 'browser',
            customHosts: '',
            exportFormat: 'raw',
            notificationSound: false,
            deepScan: false
        },

        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2),

        getKey() {
            const gmKey = GM_getValue('rd_api_key', '');
            if (gmKey) return gmKey;
            const lsKey = localStorage.getItem('rd_api_key_backup');
            return lsKey || '';
        },

        saveKey(key) {
            if (!key || key.trim().length < 5) return;
            GM_setValue('rd_api_key', key.trim());
            localStorage.setItem('rd_api_key_backup', key.trim());
            State.apiKey = key.trim();
        },

        clearKey() {
            GM_setValue('rd_api_key', '');
            localStorage.removeItem('rd_api_key_backup');
            State.apiKey = '';
        },

        getActiveRegex() {
            const allHosts = [...this.BASE_HOSTS];

            // Add dynamic hosts
            if (State.dynamicHosts && State.dynamicHosts.length) {
                State.dynamicHosts.forEach(h => {
                    allHosts.push(h.replace(/\./g, '\\.'));
                });
            }

            // Add custom hosts from settings
            if (State.settings && State.settings.customHosts) {
                State.settings.customHosts.split(',').map(h => h.trim()).filter(Boolean).forEach(h => {
                    allHosts.push(h.replace(/\./g, '\\.'));
                });
            }

            return new RegExp('\\b(' + allHosts.join('|') + ')', 'i');
        },

        hostRegex: null
    };

    // =========================================================================


// State Module
    // =========================================================================

    const State = {
        apiKey: '',
        settings: {},
        currentTab: 'links',
        isExpanded: false,
        isMobile: false,
        // Data
        linkHistory: [],
        cachedTorrents: [],
        cachedCloud: [],
        scannedLinksMap: new Map(),
        dynamicHosts: [],
        liveHosts: {},
        userProfile: null,
        trafficData: null,
        // Transient
        processedUrls: new Set(),
        completedTorrentsMemory: new Set(),
        isFirstTorrentFetch: true,
        torrentRefreshInterval: null,
        magnetCacheQueue: [],
        cacheCheckTimer: null,
        // Session
        sessionStats: { processed: 0 },
        lastUrl: location.href
    };

    // =========================================================================
    // State Initialization
    // =========================================================================

    State.apiKey = Config.getKey();
    State.isMobile = Config.isMobile;

    // Validate and load settings
    const savedSettings = JSON.parse(GM_getValue('rd_settings', '{}'));
    State.settings = {};
    for (const key of Object.keys(Config.defaultSettings)) {
        State.settings[key] = savedSettings.hasOwnProperty(key) ? savedSettings[key] : Config.defaultSettings[key];
    }

    // Load and validate history (cap at 500)
    try {
        const hist = JSON.parse(GM_getValue('rd_link_history', '[]'));
        State.linkHistory = Array.isArray(hist) ? hist.filter(h => h && h.type).slice(-500) : [];
    } catch(e) { State.linkHistory = []; }

    // Load dynamic hosts
    try { State.dynamicHosts = JSON.parse(GM_getValue('rd_dynamic_hosts', '[]')); } catch(e) { State.dynamicHosts = []; }

    // Now build the host regex
    Config.hostRegex = Config.getActiveRegex();

    // =========================================================================


// Utility Functions
    // =========================================================================

    function saveSettings() { GM_setValue('rd_settings', JSON.stringify(State.settings)); }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function decodeBase64Heuristic(text) {
        const b64Regex = /([A-Za-z0-9+\/]{30,}={0,2})/g;
        return text.replace(b64Regex, (match) => {
            try {
                const decoded = atob(match);
                if (/^https?:\/\//i.test(decoded) || /^magnet:\?/i.test(decoded)) return decoded;
            } catch(e) {}
            return match;
        });
    }

    function getStreamUrl(url) {
        if (State.settings.extPlayer === 'vlc') return 'vlc://' + url;
        if (State.settings.extPlayer === 'iina') return 'iina://weblink?url=' + url;
        if (State.settings.extPlayer === 'infuse') return 'infuse://x-callback-url/play?url=' + encodeURIComponent(url);
        return url;
    }

    // =========================================================================


// API Module
    // =========================================================================

    const API = {
        _queue: [],
        _activeCount: 0,
        _maxPerSec: 4,
        _BASE: 'https://api.real-debrid.com/rest/1.0',

        _enqueue(fn) {
            return new Promise((resolve, reject) => {
                this._queue.push(() => fn().then(resolve, reject));
                this._drain();
            });
        },

        _drain() {
            while (this._activeCount < this._maxPerSec && this._queue.length) {
                const task = this._queue.shift();
                this._activeCount++;
                const started = Date.now();
                task().finally(() => {
                    const elapsed = Date.now() - started;
                    const wait = Math.max(0, 250 - elapsed);
                    setTimeout(() => {
                        this._activeCount--;
                        this._drain();
                    }, wait);
                });
            }
        },

        request(method, endpoint, data, _retried) {
            if (!State.apiKey) return Promise.resolve({ ok: false, error: 'No API Key' });

            return this._enqueue(() => new Promise((resolve) => {
                const url = this._BASE + endpoint;
                const headers = { 'Authorization': 'Bearer ' + State.apiKey };
                let body = undefined;

                if (method === 'POST' && data) {
                    headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    body = Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');
                }

                GM_xmlhttpRequest({
                    method: method,
                    url: url,
                    headers: headers,
                    data: body,
                    onload: (resp) => {
                        const status = resp.status;

                        // Auth errors
                        if (status === 401 || status === 403) {
                            Config.clearKey();
                            return resolve({ ok: false, error: 'Auth Error' });
                        }

                        // Rate limit — retry once
                        if (status === 429 && !_retried) {
                            const retryAfter = parseInt(resp.responseHeaders?.match(/retry-after:\s*(\d+)/i)?.[1]) || 5;
                            return setTimeout(() => {
                                this.request(method, endpoint, data, true).then(resolve);
                            }, retryAfter * 1000);
                        }

                        // Service unavailable — retry once after 2s
                        if (status === 503 && !_retried) {
                            return setTimeout(() => {
                                this.request(method, endpoint, data, true).then(resolve);
                            }, 2000);
                        }

                        // Other errors
                        if (status >= 400) {
                            return resolve({ ok: false, error: 'API: ' + status });
                        }

                        // Success — parse JSON (handle empty responses from DELETE etc.)
                        const text = (resp.responseText || '').trim();
                        if (!text) {
                            resolve({ ok: true, data: null });
                        } else {
                            try {
                                resolve({ ok: true, data: JSON.parse(text) });
                            } catch(e) {
                                resolve({ ok: false, error: 'Parse Error' });
                            }
                        }
                    },
                    onerror: () => {
                        resolve({ ok: false, error: 'Network Error' });
                    }
                });
            }));
        },

        get(endpoint) {
            return this.request('GET', endpoint);
        },

        post(endpoint, data) {
            return this.request('POST', endpoint, data);
        },

        del(endpoint) {
            return this.request('DELETE', endpoint);
        },

        upload(endpoint, file) {
            if (!State.apiKey) return Promise.resolve({ ok: false, error: 'No API Key' });

            return this._enqueue(() => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const arrayBuffer = reader.result;
                    const uint8 = new Uint8Array(arrayBuffer);
                    const boundary = '----RDSuite' + Date.now().toString(36) + Math.random().toString(36).slice(2);
                    const encoder = new TextEncoder();

                    // Build multipart body
                    const header = '--' + boundary + '\r\n' +
                        'Content-Disposition: form-data; name="file"; filename="' + file.name + '"\r\n' +
                        'Content-Type: application/octet-stream\r\n\r\n';
                    const footer = '\r\n--' + boundary + '--\r\n';

                    const headerBytes = encoder.encode(header);
                    const footerBytes = encoder.encode(footer);

                    // Combine into single Uint8Array
                    const body = new Uint8Array(headerBytes.length + uint8.length + footerBytes.length);
                    body.set(headerBytes, 0);
                    body.set(uint8, headerBytes.length);
                    body.set(footerBytes, headerBytes.length + uint8.length);

                    GM_xmlhttpRequest({
                        method: 'PUT',
                        url: this._BASE + endpoint,
                        headers: {
                            'Authorization': 'Bearer ' + State.apiKey,
                            'Content-Type': 'multipart/form-data; boundary=' + boundary
                        },
                        data: body.buffer,
                        onload: (resp) => {
                            const status = resp.status;

                            if (status === 401 || status === 403) {
                                Config.clearKey();
                                return resolve({ ok: false, error: 'Auth Error' });
                            }

                            if (status >= 400) {
                                return resolve({ ok: false, error: 'API: ' + status });
                            }

                            const text = (resp.responseText || '').trim();
                            if (!text) {
                                resolve({ ok: true, data: null });
                            } else {
                                try {
                                    resolve({ ok: true, data: JSON.parse(text) });
                                } catch(e) {
                                    resolve({ ok: false, error: 'Parse Error' });
                                }
                            }
                        },
                        onerror: () => {
                            resolve({ ok: false, error: 'Network Error' });
                        }
                    });
                };
                reader.onerror = () => {
                    resolve({ ok: false, error: 'File Read Error' });
                };
                reader.readAsArrayBuffer(file);
            }));
        }
    };


// --- DOM Helper Module ---
    const DOM = {
        create(tag, attrs = {}, children = []) {
            const el = document.createElement(tag);
            for (const [key, value] of Object.entries(attrs)) {
                if (key === 'className') {
                    el.className = value;
                } else if (key === 'textContent') {
                    el.textContent = value;
                } else if (key === 'htmlContent') {
                    el.innerHTML = value;
                } else if (key === 'style' && typeof value === 'object') {
                    for (const [prop, val] of Object.entries(value)) {
                        el.style[prop] = val;
                    }
                } else if (key === 'style' && typeof value === 'string') {
                    el.style.cssText = value;
                } else if (key === 'dataset' && typeof value === 'object') {
                    for (const [dk, dv] of Object.entries(value)) {
                        el.dataset[dk] = dv;
                    }
                } else if (key.startsWith('on') && typeof value === 'function') {
                    el.addEventListener(key.slice(2).toLowerCase(), value);
                } else {
                    el.setAttribute(key, value);
                }
            }
            DOM._appendChildren(el, children);
            return el;
        },

        text(str) {
            return document.createTextNode(str);
        },

        fragment(children) {
            const frag = document.createDocumentFragment();
            DOM._appendChildren(frag, children);
            return frag;
        },

        clear(el) {
            while (el.firstChild) el.removeChild(el.firstChild);
        },

        _appendChildren(parent, children) {
            for (const child of children) {
                if (child == null) continue;
                if (Array.isArray(child)) {
                    DOM._appendChildren(parent, child);
                } else if (typeof child === 'string') {
                    parent.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    parent.appendChild(child);
                }
            }
        }
    };

    // =========================================================================
    // UI Shell — Styles + FAB + Dashboard Frame + Toasts + Modals
    // =========================================================================


// --- Step 2: UI Module ---
    const LIGHTNING_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';

    const UI = {
        init() {
            // Main container
            const container = DOM.create('div', { id: 'rd-ui-container' });
            document.body.appendChild(container);

            // Toast container
            const toastContainer = DOM.create('div', { id: 'rd-toast-container' });
            document.body.appendChild(toastContainer);

            // Selection tooltip
            const selTooltip = DOM.create('div', { id: 'rd-sel-tooltip', textContent: 'Process Link' });
            document.body.appendChild(selTooltip);

            // X-ray tooltip
            const xrayTooltip = DOM.create('div', { id: 'rd-xray-tooltip' });
            document.body.appendChild(xrayTooltip);

            if (!State.apiKey) {
                UI.renderSetup();
            } else {
                UI.renderFAB();
            }

            // --- Step 3: Event delegation ---
            // Click delegation on container
            container.addEventListener('click', (e) => {
                // If FAB is showing (not expanded) and has API key, open dashboard
                if (!State.isExpanded && State.apiKey) {
                    const fab = container.querySelector('.rd-desktop-fab, .rd-mobile-fab');
                    if (fab && (fab === e.target || fab.contains(e.target))) {
                        UI.toggleDashboard(true);
                        return;
                    }
                }
            });

            // Global keydown
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    // Cascade: modal -> fullscreen -> media -> dashboard
                    const modal = document.querySelector('.rd-modal-overlay');
                    if (modal) { modal.remove(); return; }
                    const fullscreen = document.querySelector('#rd-media-window.rd-fullscreen');
                    if (fullscreen) { fullscreen.classList.remove('rd-fullscreen'); return; }
                    const media = document.querySelector('#rd-media-window');
                    if (media) { media.remove(); return; }
                    if (State.isExpanded) { UI.toggleDashboard(false); return; }
                }
                if (e.altKey && e.key.toLowerCase() === 'r') {
                    e.preventDefault();
                    UI.toggleDashboard(!State.isExpanded);
                }
            });

            // Visibility change — pause/resume torrent polling
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    if (State.torrentRefreshInterval) {
                        clearInterval(State.torrentRefreshInterval);
                        State.torrentRefreshInterval = null;
                    }
                } else {
                    if (State.isExpanded && State.currentTab === 'torrents' && typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.startPolling) {
                        Tabs.Torrents.startPolling();
                    }
                }
            });

            // Drag and drop on container
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.add('rd-drag-active');
            });
            container.addEventListener('dragleave', (e) => {
                e.preventDefault();
                container.classList.remove('rd-drag-active');
            });
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.remove('rd-drag-active');

                // Check for .torrent files
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                    for (const file of e.dataTransfer.files) {
                        if (file.name.endsWith('.torrent')) {
                            API.upload('/torrents/addTorrent', file).then(res => {
                                if (res.ok) {
                                    UI.showToast('Torrent uploaded: ' + file.name);
                                } else {
                                    UI.showToast('Upload failed: ' + (res.error || 'Unknown'), 'error');
                                }
                            });
                        }
                    }
                    return;
                }

                // Check for text data (links)
                const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
                if (text && typeof handleManualInput === 'function') {
                    handleManualInput(text);
                } else if (text) {
                    UI.showToast('Dropped text received (handler not ready)');
                }
            });
        },

        renderFAB() {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;
            DOM.clear(container);

            const fabClass = State.isMobile ? 'rd-mobile-fab' : 'rd-desktop-fab';
            const badge = DOM.create('span', { className: 'rd-badge', id: 'rd-fab-badge', textContent: '0' });
            const fab = DOM.create('div', { className: fabClass, style: 'position:relative;' }, [
                DOM.create('span', { htmlContent: LIGHTNING_SVG }),
                badge
            ]);

            container.appendChild(fab);

            // Auto-show logic
            const count = State.scannedLinksMap.size;
            if (count === 0 && State.settings.autoShow) {
                container.classList.add('rd-hidden');
            } else {
                container.classList.remove('rd-hidden');
            }

            UI.updateBadge(count);
        },

        renderSetup() {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;
            DOM.clear(container);

            // Position container center
            container.style.cssText = 'position:fixed;z-index:999999;top:50%;left:50%;transform:translate(-50%,-50%);';

            const input = DOM.create('input', {
                type: 'text',
                placeholder: 'Paste your API key here...',
                className: 'rd-textarea',
                style: 'height:auto;padding:10px;font-family:monospace;font-size:13px;'
            });

            const card = DOM.create('div', {
                style: 'background:var(--rd-bg-base);border:1px solid var(--rd-glass-border);border-radius:var(--rd-radius-lg);padding:24px;width:340px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--rd-shadow);'
            }, [
                DOM.create('div', { style: 'font-size:16px;font-weight:bold;color:var(--rd-text-primary);', textContent: 'Setup Required' }),
                DOM.create('div', { style: 'font-size:12px;color:var(--rd-text-secondary);line-height:1.5;', textContent: 'Enter your Real-Debrid API key to get started.' }),
                input,
                DOM.create('button', {
                    className: 'rd-input-btn primary',
                    textContent: 'Save Key',
                    style: 'padding:10px;font-size:13px;',
                    onClick: () => {
                        const key = input.value.trim();
                        if (key.length < 5) {
                            UI.showToast('Key too short', 'error');
                            return;
                        }
                        Config.saveKey(key);
                        UI.showToast('API key saved! Reloading...');
                        setTimeout(() => location.reload(), 800);
                    }
                }),
                DOM.create('a', {
                    href: 'https://real-debrid.com/apitoken',
                    target: '_blank',
                    style: 'color:var(--rd-accent);font-size:11px;text-align:center;text-decoration:none;',
                    textContent: 'Get Token Here'
                })
            ]);

            container.appendChild(card);
        },

        toggleDashboard(show) {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;

            if (show) {
                State.isExpanded = true;
                // Reset container inline style in case setup changed it
                container.style.cssText = '';
                container.classList.remove('rd-hidden');
                const dashClass = State.isMobile ? 'rd-mobile-sheet' : 'rd-desktop-dash';
                container.className = dashClass;
                UI.renderDashboard();
                addMobileSheetBehavior(container);

                // Start torrent polling if on torrents tab
                if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.startPolling) {
                    Tabs.Torrents.startPolling();
                }
            } else {
                State.isExpanded = false;
                container.className = '';
                container.style.cssText = '';

                // Stop torrent polling
                if (typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.stopPolling) {
                    Tabs.Torrents.stopPolling();
                }

                UI.renderFAB();
                UI.updateBadge(State.scannedLinksMap.size);
            }
        },

        renderDashboard() {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;
            DOM.clear(container);

            // Header
            const header = DOM.create('div', { className: 'rd-header' }, [
                DOM.create('div', { style: 'display:flex;align-items:center;gap:8px;' }, [
                    DOM.create('span', { htmlContent: LIGHTNING_SVG, style: 'display:flex;color:var(--rd-accent);' }),
                    DOM.create('span', { textContent: 'RD Suite', style: 'font-weight:bold;font-size:14px;color:var(--rd-text-primary);' }),
                    DOM.create('span', {
                        textContent: 'v38',
                        style: 'background:var(--rd-bg-glass);padding:2px 8px;border-radius:10px;font-size:9px;color:var(--rd-text-secondary);border:1px solid var(--rd-glass-border);'
                    }),
                    DOM.create('span', {
                        textContent: State.sessionStats.processed + ' processed',
                        style: 'font-size:10px;color:var(--rd-text-secondary);margin-left:4px;',
                        id: 'rd-session-counter'
                    })
                ]),
                DOM.create('span', {
                    textContent: '\u2715',
                    style: 'cursor:pointer;color:var(--rd-text-secondary);font-size:16px;padding:4px 8px;',
                    className: 'rd-close-btn',
                    onClick: () => UI.toggleDashboard(false)
                })
            ]);

            // Tabs
            const tabDefs = [
                { key: 'links', label: 'Links' },
                { key: 'page', label: 'Page', badge: true },
                { key: 'torrents', label: 'Torrents' },
                { key: 'cloud', label: 'Cloud' },
                { key: 'settings', label: 'Settings' }
            ];

            const tabs = DOM.create('div', { className: 'rd-tabs' });
            tabDefs.forEach(t => {
                const tabChildren = [DOM.text(t.label)];
                if (t.badge) {
                    const count = State.scannedLinksMap.size;
                    tabChildren.push(DOM.create('span', {
                        id: 'rd-tab-badge-' + t.key,
                        textContent: count > 0 ? ' (' + count + ')' : '',
                        style: 'color:var(--rd-accent);font-size:10px;'
                    }));
                }
                const tab = DOM.create('div', {
                    className: 'rd-tab' + (State.currentTab === t.key ? ' active' : ''),
                    dataset: { tab: t.key },
                    onClick: () => {
                        // Stop torrent polling when leaving torrents tab
                        if (State.currentTab === 'torrents' && t.key !== 'torrents' && typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.stopPolling) {
                            Tabs.Torrents.stopPolling();
                        }

                        State.currentTab = t.key;

                        // Update active class on all tabs
                        tabs.querySelectorAll('.rd-tab').forEach(tb => tb.classList.remove('active'));
                        tab.classList.add('active');

                        // Start torrent polling when entering torrents tab
                        if (t.key === 'torrents' && typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.startPolling) {
                            Tabs.Torrents.startPolling();
                        }

                        // Render tab content
                        const capKey = t.key.charAt(0).toUpperCase() + t.key.slice(1);
                        if (typeof Tabs !== 'undefined' && Tabs[capKey] && Tabs[capKey].render) {
                            Tabs[capKey].render();
                        } else {
                            const content = document.getElementById('rd-content-area');
                            if (content) {
                                DOM.clear(content);
                                content.appendChild(DOM.create('div', {
                                    style: 'padding:40px;text-align:center;color:var(--rd-text-secondary);font-size:12px;',
                                    textContent: 'Tab "' + capKey + '" not loaded yet.'
                                }));
                            }
                        }
                    }
                }, tabChildren);
                tabs.appendChild(tab);
            });

            // Content area
            const contentArea = DOM.create('div', { className: 'rd-content', id: 'rd-content-area' });

            container.appendChild(header);
            container.appendChild(tabs);
            container.appendChild(contentArea);

            // Render current tab content
            const capKey = State.currentTab.charAt(0).toUpperCase() + State.currentTab.slice(1);
            if (typeof Tabs !== 'undefined' && Tabs[capKey] && Tabs[capKey].render) {
                Tabs[capKey].render();
            } else {
                contentArea.appendChild(DOM.create('div', {
                    style: 'padding:40px;text-align:center;color:var(--rd-text-secondary);font-size:12px;',
                    textContent: 'Tab "' + capKey + '" not loaded yet.'
                }));
            }
        },

        showToast(msg, type = 'info') {
            const toastContainer = document.getElementById('rd-toast-container');
            if (!toastContainer) return;

            const toast = DOM.create('div', {
                className: 'rd-toast' + (type === 'error' ? ' error' : ''),
                textContent: msg
            });
            toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'toastOut 0.3s ease forwards';
                setTimeout(() => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 300);
            }, 3000);
        },

        showModal(title, contentElements, footerElements) {
            const closeBtn = DOM.create('span', {
                textContent: '\u2715',
                style: 'cursor:pointer;color:var(--rd-text-secondary);font-size:16px;padding:4px;'
            });

            const modalHeader = DOM.create('div', { className: 'rd-modal-header' }, [
                DOM.create('span', { textContent: title }),
                closeBtn
            ]);

            const modalContent = DOM.create('div', { className: 'rd-modal-content' }, contentElements || []);
            const modalFooter = DOM.create('div', { className: 'rd-modal-footer' }, footerElements || []);

            const modal = DOM.create('div', { className: 'rd-modal' }, [
                modalHeader,
                modalContent,
                modalFooter
            ]);

            const overlay = DOM.create('div', { className: 'rd-modal-overlay' }, [modal]);

            function close() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                document.removeEventListener('keydown', escHandler);
            }

            function escHandler(e) {
                if (e.key === 'Escape') {
                    close();
                }
            }

            closeBtn.addEventListener('click', close);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
            document.addEventListener('keydown', escHandler);

            document.body.appendChild(overlay);

            return { overlay, modal, close };
        },

        updateBadge(count) {
            // FAB badge
            const fabBadge = document.getElementById('rd-fab-badge');
            if (fabBadge) {
                fabBadge.textContent = count > 99 ? '99+' : String(count);
                fabBadge.classList.toggle('visible', count > 0);
            }

            // Tab badge (Page tab)
            const tabBadge = document.getElementById('rd-tab-badge-page');
            if (tabBadge) {
                tabBadge.textContent = count > 0 ? ' (' + count + ')' : '';
            }

            // Auto-show FAB
            const container = document.getElementById('rd-ui-container');
            if (!State.isExpanded && container && State.settings.autoShow && count > 0) {
                container.classList.remove('rd-hidden');
            }
        },

        copyToClipboard(text, btnElement) {
            const doCopy = () => {
                if (btnElement) {
                    const original = btnElement.textContent;
                    btnElement.textContent = '\u2714';
                    setTimeout(() => { btnElement.textContent = original; }, 1500);
                } else {
                    UI.showToast('Copied');
                }
            };

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(doCopy).catch(() => {
                        GM_setClipboard(text);
                        doCopy();
                    });
                } else {
                    GM_setClipboard(text);
                    doCopy();
                }
            } catch(e) {
                GM_setClipboard(text);
                doCopy();
            }
        }
    };


// ===================== Core Functions — Link Processing =====================

    function addToHistory(item) {
        item.time = item.time || new Date().toLocaleTimeString();
        State.linkHistory.push(item);
        if (State.linkHistory.length > 500) State.linkHistory = State.linkHistory.slice(-500);
        GM_setValue('rd_link_history', JSON.stringify(State.linkHistory));
        if (item.type === 'success') State.sessionStats.processed++;
        // Update header stats counter if visible
        const statsEl = document.getElementById('rd-session-counter');
        if (statsEl) statsEl.textContent = State.sessionStats.processed + ' processed';
        if (State.currentTab === 'links' && typeof Tabs !== 'undefined' && Tabs.Links) Tabs.Links.refresh();
    }

    async function unrestrictLink(url, silent = false) {
        const { ok, data, error } = await API.post('/unrestrict/link', { link: url });
        if (!ok) {
            addToHistory({ type: 'error', msg: 'Unrestrict failed: ' + error });
            return null;
        }
        const dlUrl = data.download;
        addToHistory({
            type: 'success', name: data.filename,
            url: dlUrl, download: dlUrl,
            size: formatBytes(data.filesize)
        });
        if (!silent) {
            if (State.settings.defaultAction === 'dl') window.open(dlUrl, '_blank');
            else if (State.settings.defaultAction === 'copy') UI.copyToClipboard(dlUrl);
        }
        return dlUrl;
    }

    async function unrestrictLinkOrFolder(url, silent = false, filter = null, callback = null) {
        const { ok, data, error } = await API.post('/unrestrict/link', { link: url });
        if (ok && data && data.download) {
            const dlUrl = data.download;
            addToHistory({
                type: 'success', name: data.filename,
                url: dlUrl, download: dlUrl,
                size: formatBytes(data.filesize)
            });
            if (!silent) {
                if (State.settings.defaultAction === 'dl') window.open(dlUrl, '_blank');
                else if (State.settings.defaultAction === 'copy') UI.copyToClipboard(dlUrl);
            }
            if (callback) callback(dlUrl);
            return dlUrl;
        }
        // Try folder endpoint
        const folderRes = await API.post('/unrestrict/folder', { link: url });
        if (folderRes.ok && Array.isArray(folderRes.data)) {
            let firstUrl = null;
            for (const childUrl of folderRes.data) {
                if (filter && !filter.test(childUrl)) continue;
                const childDl = await unrestrictLink(childUrl, silent);
                if (!firstUrl && childDl) firstUrl = childDl;
            }
            if (callback && firstUrl) callback(firstUrl);
            return firstUrl;
        }
        addToHistory({ type: 'error', msg: 'Failed: ' + (error || 'Unknown error') });
        if (callback) callback(null);
        return null;
    }

    async function handleManualInput(text) {
        const textarea = document.getElementById('rd-manual-input');
        const raw = text || (textarea ? textarea.value : '');
        if (!raw.trim()) return UI.showToast('Nothing to process', 'error');

        const decoded = decodeBase64Heuristic(raw);
        const urls = decoded.match(/https?:\/\/[^\s<>"']+/gi) || [];
        const magnets = decoded.match(/magnet:\?[^\s<>"']+/gi) || [];
        const all = [...new Set([...magnets, ...urls])];

        if (all.length === 0) return UI.showToast('No links found', 'error');
        if (textarea) textarea.value = '';

        for (const link of all) {
            if (State.processedUrls.has(link)) continue;
            State.processedUrls.add(link);
            if (link.startsWith('magnet:')) addMagnet(link);
            else unrestrictLinkOrFolder(link);
        }
    }

    // --- CRUD functions ---

    async function deleteTorrent(id) {
        const { ok } = await API.del('/torrents/delete/' + id);
        if (ok) {
            State.cachedTorrents = State.cachedTorrents.filter(t => t.id !== id);
            if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.refresh();
            UI.showToast('Torrent deleted');
        }
    }

    async function deleteCloudItem(id) {
        const { ok } = await API.del('/downloads/delete/' + id);
        if (ok) {
            State.cachedCloud = State.cachedCloud.filter(c => c.id !== id);
            if (State.currentTab === 'cloud' && typeof Tabs !== 'undefined') Tabs.Cloud.refresh();
            UI.showToast('Removed from cloud');
        }
    }

    async function cleanupTorrents() {
        const dead = State.cachedTorrents.filter(t => t.status === 'dead' || t.status === 'error');
        if (dead.length === 0) return UI.showToast('Nothing to clean');
        await Promise.all(dead.map(t => API.del('/torrents/delete/' + t.id)));
        State.cachedTorrents = State.cachedTorrents.filter(t => t.status !== 'dead' && t.status !== 'error');
        if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.refresh();
        UI.showToast('Cleaned ' + dead.length + ' dead torrents');
    }

    async function convertPoints() {
        const { ok, error } = await API.post('/settings/convertPoints');
        if (ok) {
            UI.showToast('Points converted! +30 days');
            State.userProfile = null;
            State.trafficData = null;
            if (State.currentTab === 'settings' && typeof Tabs !== 'undefined') Tabs.Settings.render();
        } else {
            UI.showToast('Failed: ' + error, 'error');
        }
    }

    // --- Magnet handling ---

    async function addMagnet(magnet, callback = null) {
        UI.showToast('Sending Magnet...');
        const { ok, data, error } = await API.post('/torrents/addMagnet', { magnet: magnet });
        if (!ok) {
            addToHistory({ type: 'error', msg: 'Magnet Error: ' + error });
            return;
        }

        const torrentId = data.id;

        if (State.settings.magnetAction === 'all') {
            await API.post('/torrents/selectFiles/' + torrentId, { files: 'all' });
            addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
            UI.showToast('Magnet Added Successfully!');
            if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.render();
            if (callback) callback();
            return;
        }

        // Need file info for other modes
        const infoRes = await API.get('/torrents/info/' + torrentId);
        if (!infoRes.ok || !infoRes.data || !infoRes.data.files) {
            // Fallback: select all
            await API.post('/torrents/selectFiles/' + torrentId, { files: 'all' });
            addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
            UI.showToast('Magnet Added!');
            if (callback) callback();
            return;
        }

        const files = infoRes.data.files;
        const title = infoRes.data.filename || 'Torrent';

        if (State.settings.magnetAction === 'manual') {
            showTorrentSelectorModal(torrentId, files, title, callback);
            return;
        }

        if (State.settings.magnetAction === 'video') {
            const videoExts = /\.(mp4|mkv|avi|mov|webm)$/i;
            let largestId = null, maxSize = 0;
            files.forEach(f => {
                if (videoExts.test(f.path) && f.bytes > maxSize) { maxSize = f.bytes; largestId = f.id; }
            });
            if (largestId) {
                await API.post('/torrents/selectFiles/' + torrentId, { files: String(largestId) });
                addToHistory({ type: 'success', name: 'Main Video Added', url: '#', size: formatBytes(maxSize) });
                UI.showToast('Main Video Added!');
                if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.render();
                if (callback) callback();
            } else {
                // No video found — fallback to manual
                showTorrentSelectorModal(torrentId, files, title, callback);
            }
            return;
        }

        // Smart mode (default)
        let fileIds = 'all';
        if (State.settings.smartFilter) {
            const exts = State.settings.filterExts.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
            if (exts.length > 0) {
                const extRegex = new RegExp('\\.(' + exts.join('|') + ')$', 'i');
                const validFiles = files.filter(f => !extRegex.test(f.path));
                if (validFiles.length > 0) fileIds = validFiles.map(f => f.id).join(',');
            }
        }
        await API.post('/torrents/selectFiles/' + torrentId, { files: fileIds });
        addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
        UI.showToast('Magnet Added Successfully!');
        if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.render();
        if (callback) callback();
    }

    // --- Torrent file selector modal ---

    function showTorrentSelectorModal(torrentId, files, title, callback) {
        const container = DOM.create('div', { style: 'display:flex;flex-direction:column;gap:10px;max-height:60vh;' });

        const headerRow = DOM.create('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px;' });
        const selectAllBtn = DOM.create('button', { textContent: 'Select All', className: 'rd-input-btn' });
        const selectNoneBtn = DOM.create('button', { textContent: 'Select None', className: 'rd-input-btn' });
        headerRow.append(selectAllBtn, selectNoneBtn);
        container.append(headerRow);

        const fileList = DOM.create('div', { style: 'overflow-y:auto;max-height:50vh;display:flex;flex-direction:column;gap:4px;' });
        const checkboxes = [];

        files.forEach(f => {
            const row = DOM.create('label', { style: 'display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:var(--rd-radius-xs);cursor:pointer;font-size:13px;' });
            const cb = DOM.create('input', { type: 'checkbox', checked: true, style: 'flex-shrink:0;' });
            cb.dataset.fileId = f.id;
            checkboxes.push(cb);

            const parts = f.path.split('/');
            const fileName = parts.pop();
            const folderPrefix = parts.length > 0 ? parts.join('/') + '/' : '';

            const label = DOM.create('span');
            if (folderPrefix) label.append(DOM.create('span', { textContent: folderPrefix, style: 'opacity:0.5;' }));
            label.append(DOM.create('span', { textContent: fileName, style: 'font-weight:bold;' }));

            row.append(cb, label, DOM.create('span', {
                textContent: formatBytes(f.bytes),
                style: 'margin-left:auto;opacity:0.6;font-size:12px;white-space:nowrap;'
            }));
            fileList.append(row);
        });

        container.append(fileList);

        selectAllBtn.addEventListener('click', () => checkboxes.forEach(cb => { cb.checked = true; }));
        selectNoneBtn.addEventListener('click', () => checkboxes.forEach(cb => { cb.checked = false; }));

        const cancelBtn = DOM.create('button', { textContent: 'Cancel', className: 'rd-input-btn' });
        const startBtn = DOM.create('button', { textContent: 'Start Download', className: 'rd-input-btn primary' });
        const modal = UI.showModal(title, [container], [cancelBtn, startBtn]);

        cancelBtn.addEventListener('click', () => {
            modal.close();
            API.del('/torrents/delete/' + torrentId);
        });

        startBtn.addEventListener('click', async () => {
            const selectedIds = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.fileId);
            if (selectedIds.length === 0) {
                UI.showToast('Select at least one file', 'error');
                return;
            }
            await API.post('/torrents/selectFiles/' + torrentId, { files: selectedIds.join(',') });
            addToHistory({ type: 'success', name: title, url: '#', size: selectedIds.length + ' files' });
            UI.showToast('Torrent started with ' + selectedIds.length + ' files!');
            modal.close();
            if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.render();
            if (callback) callback();
        });
    }

    // --- Queue processing with parallel concurrency ---

    async function processQueue(urls, mode) {
        const concurrency = 3;
        let completed = 0;
        const total = urls.length;
        const remaining = [...urls]; // copy to avoid mutating

        UI.showToast('Processing ' + total + ' links...');

        const worker = async () => {
            while (remaining.length > 0) {
                const url = remaining.shift();
                if (url.startsWith('magnet:')) {
                    await addMagnet(url);
                } else {
                    await unrestrictLinkOrFolder(url, mode === 'queue', null, (finalUrl) => {
                        if (mode === 'dl' && finalUrl) window.open(finalUrl, '_blank');
                    });
                }
                completed++;
                const progEl = document.getElementById('rd-queue-progress');
                if (progEl) progEl.textContent = completed + '/' + total;
            }
        };

        const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
        await Promise.all(workers);
        UI.showToast('Queue finished');
    }

    // --- M3U generation ---

    async function generateM3U(name, links) {
        UI.showToast('Generating M3U...');
        let m3u = '#EXTM3U\n';
        for (const link of links) {
            const { ok, data } = await API.post('/unrestrict/link', { link });
            if (ok && data && data.download) {
                m3u += '#EXTINF:-1,' + data.filename + '\n' + data.download + '\n';
            }
        }
        const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
        const url = URL.createObjectURL(blob);
        const a = DOM.create('a', { href: url, download: name.replace(/[^a-z0-9]/gi, '_') + '.m3u' });
        a.click();
        URL.revokeObjectURL(url);
        UI.showToast('M3U Downloaded!');
    }

    // --- Export helpers ---

    function getExportUrls(scope) {
        if (scope === 'local') return State.linkHistory.filter(h => h.type === 'success').map(h => h.url);
        if (scope === 'page') {
            return Array.from(document.querySelectorAll('.rd-page-chk:checked'))
                .map(c => { const btn = document.querySelector('.rd-page-1click[data-url="' + CSS.escape(c.value) + '"]'); return btn ? btn.dataset.dlUrl : null; })
                .filter(u => u);
        }
        if (scope === 'cloud') {
            return Array.from(document.querySelectorAll('.rd-cloud-chk:checked')).map(c => c.dataset.url);
        }
        return [];
    }

    function formatExport(urls) {
        if (!urls.length) { UI.showToast('No links to export', 'error'); return; }
        let result;
        if (State.settings.exportFormat === 'curl') result = urls.map(u => 'curl -O "' + u + '"').join('\n');
        else if (State.settings.exportFormat === 'wget') result = urls.map(u => 'wget "' + u + '"').join('\n');
        else result = urls.join('\n');
        UI.copyToClipboard(result);
    }


// ===================== Tabs (Links + Page) =====================

    const Tabs = {};

    Tabs.Links = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            // Input area
            const inputArea = DOM.create('div', { className: 'rd-input-area' });
            const textarea = DOM.create('textarea', {
                id: 'rd-manual-input', className: 'rd-textarea',
                placeholder: 'Paste links, folders, magnets, or Base64...'
            });
            const btnRow = DOM.create('div', { style: 'display:flex; gap:8px; margin-top:8px;' });
            const unrestrictBtn = DOM.create('button', {
                id: 'rd-btn-unrestrict', className: 'rd-input-btn primary',
                textContent: 'Unrestrict', style: 'flex:2;',
                onClick: () => handleManualInput()
            });
            const clearBtn = DOM.create('button', {
                id: 'rd-btn-clear', className: 'rd-input-btn',
                textContent: 'Clear', style: 'flex:1;',
                onClick: () => { State.linkHistory = []; GM_setValue('rd_link_history', '[]'); Tabs.Links.render(); UI.showToast('History Cleared'); }
            });
            btnRow.append(unrestrictBtn, clearBtn);

            // Export controls
            const exportRow = DOM.create('div', { style: 'display:flex; justify-content:flex-end; margin-top:8px;' });
            exportRow.append(buildExportControls('local'));

            inputArea.append(textarea, btnRow, exportRow);

            // History list
            const logList = DOM.create('div', { className: 'rd-log-list', id: 'rd-links-history' });
            this._renderHistory(logList);

            area.append(inputArea, logList);
        },

        refresh() {
            const logList = document.getElementById('rd-links-history');
            if (logList) this._renderHistory(logList);
        },

        _renderHistory(container) {
            DOM.clear(container);
            if (State.linkHistory.length === 0) {
                container.append(DOM.create('div', {
                    style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);',
                    textContent: 'No history. Paste links below or drag & drop.'
                }));
                return;
            }
            // Render in reverse chronological order
            for (let i = State.linkHistory.length - 1; i >= 0; i--) {
                const item = State.linkHistory[i];
                container.append(this._buildHistoryItem(item));
            }
        },

        _buildHistoryItem(item) {
            if (item.type === 'error') {
                const errEl = DOM.create('div', { className: 'rd-log-item error' }, [
                    DOM.create('div', { className: 'rd-item-content' }, [
                        DOM.create('div', { className: 'rd-filename', style: 'color:var(--rd-danger);', textContent: item.msg || 'Error' }),
                        DOM.create('div', { className: 'rd-meta', textContent: item.time || '' })
                    ])
                ]);
                return errEl;
            }
            const isMedia = /\.(mp4|mkv|avi|mov|mp3|flac|wav|jpg|png|webp)$/i.test(item.name || '');
            const btns = [
                DOM.create('button', { className: 'rd-action-btn', textContent: 'DL', onClick: () => window.open(item.url, '_blank') }),
                DOM.create('button', { className: 'rd-action-btn rd-copy-btn', textContent: 'URL', dataset: { url: item.url }, onClick: () => UI.copyToClipboard(item.url) })
            ];
            if (isMedia) {
                btns.push(DOM.create('button', {
                    className: 'rd-action-btn rd-play-btn', textContent: 'Play',
                    dataset: { url: item.download || item.url, name: item.name },
                    onClick: () => {
                        if (State.settings.extPlayer === 'browser' && typeof Media !== 'undefined') Media.open(item.download || item.url, item.name);
                        else window.open(getStreamUrl(item.download || item.url), '_self');
                    }
                }));
            }
            const row = DOM.create('div', { className: 'rd-log-item success' }, [
                DOM.create('div', { className: 'rd-item-content' }, [
                    DOM.create('div', { className: 'rd-filename', title: item.name, textContent: item.name || 'Unknown' }),
                    DOM.create('div', { className: 'rd-meta' }, [
                        DOM.create('span', { textContent: item.size || '' }),
                        DOM.create('span', { textContent: item.time || '' })
                    ]),
                    DOM.create('div', { className: 'rd-btn-group' }, btns)
                ])
            ]);
            if (item.url && item.url !== '#') {
                addMobileLongPress(row, [
                    { label: 'Copy URL', action: () => UI.copyToClipboard(item.url) },
                    { label: 'Download', action: () => window.open(item.url, '_blank') }
                ]);
            }
            return row;
        }
    };

    function buildExportControls(scope) {
        const wrapper = DOM.create('div', { style: 'display:flex; gap:6px; align-items:center;' });
        const select = DOM.create('select', { id: 'rd-export-format-' + scope, className: 'rd-select', style: 'padding:5px 8px;' });
        ['raw:Plain Text', 'curl:cURL', 'wget:Wget'].forEach(opt => {
            const [val, label] = opt.split(':');
            const option = DOM.create('option', { value: val, textContent: label });
            if (State.settings.exportFormat === val) option.selected = true;
            select.append(option);
        });
        select.addEventListener('change', () => { State.settings.exportFormat = select.value; saveSettings(); });
        const exportBtn = DOM.create('button', {
            className: 'rd-input-btn primary', textContent: 'Export', style: 'margin:0;',
            onClick: () => formatExport(getExportUrls(scope))
        });
        wrapper.append(select, exportBtn);
        return wrapper;
    }

    Tabs.Page = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            if (State.scannedLinksMap.size === 0) {
                area.append(DOM.create('div', {
                    style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);',
                    textContent: 'No supported links detected on this page.'
                }));
                return;
            }

            // Control bar
            const controlBar = DOM.create('div', { className: 'rd-control-bar' });
            const leftGroup = DOM.create('div', { className: 'rd-control-group' });

            const selectAllLabel = DOM.create('label', { style: 'display:flex; align-items:center; gap:5px; font-size:12px; cursor:pointer; font-weight:600;' });
            const selectAllChk = DOM.create('input', { type: 'checkbox', id: 'rd-page-chk-all', className: 'rd-checkbox' });
            selectAllChk.checked = true;
            selectAllChk.addEventListener('change', () => { document.querySelectorAll('.rd-page-chk').forEach(c => c.checked = selectAllChk.checked); });
            selectAllLabel.append(selectAllChk, DOM.text('All'));

            const dlSelBtn = DOM.create('button', {
                className: 'rd-input-btn primary', textContent: 'DL Selected', style: 'margin:0;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-page-chk:checked')).map(c => c.value);
                    if (!sel.length) return UI.showToast('None selected!', 'error');
                    UI.showToast('Starting ' + sel.length + ' downloads...');
                    processQueue(sel, 'dl');
                }
            });
            const queueBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Queue', style: 'margin:0; background:var(--rd-accent); color:var(--rd-bg-base); border:none;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-page-chk:checked')).map(c => c.value);
                    if (!sel.length) return UI.showToast('None selected!', 'error');
                    State.currentTab = 'links';
                    UI.renderDashboard();
                    processQueue(sel, 'queue');
                }
            });

            leftGroup.append(selectAllLabel, dlSelBtn, queueBtn);
            controlBar.append(leftGroup, buildExportControls('page'));

            // Group links by domain
            const groups = new Map();
            for (const [url, data] of State.scannedLinksMap.entries()) {
                let domain;
                try { domain = data.type === 'magnet' ? 'Magnets' : new URL(url).hostname.replace('www.', ''); } catch(e) { domain = 'Other'; }
                if (!groups.has(domain)) groups.set(domain, []);
                groups.get(domain).push({ url, ...data });
            }

            const logList = DOM.create('div', { className: 'rd-log-list' });
            for (const [domain, links] of groups.entries()) {
                // Domain header (collapsible)
                const groupHeader = DOM.create('div', {
                    style: 'display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer; font-weight:600; font-size:11px; color:var(--rd-text-secondary);',
                });
                const groupChk = DOM.create('input', { type: 'checkbox', className: 'rd-checkbox' });
                groupChk.checked = true;
                const groupLabel = DOM.create('span', { textContent: domain + ' (' + links.length + ')' });
                const groupContent = DOM.create('div', { style: 'display:flex; flex-direction:column; gap:6px;' });

                groupChk.addEventListener('change', () => {
                    groupContent.querySelectorAll('.rd-page-chk').forEach(c => c.checked = groupChk.checked);
                });
                groupHeader.addEventListener('click', (e) => {
                    if (e.target === groupChk) return;
                    groupContent.style.display = groupContent.style.display === 'none' ? 'flex' : 'none';
                });
                groupHeader.append(groupChk, groupLabel);

                // Links in group
                for (const link of links) {
                    const icon = link.type === 'magnet' ? '\u{1F9F2}' : '\u{1F517}'; // magnet or link emoji
                    const chk = DOM.create('input', { type: 'checkbox', className: 'rd-page-chk rd-checkbox', value: link.url });
                    chk.checked = true;

                    const oneClickBtn = DOM.create('button', {
                        className: 'rd-action-btn rd-page-1click', textContent: '1-Click',
                        dataset: { url: link.url },
                        style: 'background:var(--rd-success); color:var(--rd-bg-base);',
                        onClick: async function() {
                            if (this.disabled) return;
                            this.disabled = true;
                            this.textContent = '...';
                            if (link.url.startsWith('magnet:')) {
                                await addMagnet(link.url);
                                this.textContent = '\u2705';
                            } else {
                                await unrestrictLinkOrFolder(link.url, true, null, (finalUrl) => {
                                    this.dataset.dlUrl = finalUrl;
                                    if (finalUrl) window.open(finalUrl, '_blank');
                                    this.textContent = '\u2705';
                                });
                            }
                        }
                    });
                    const queueItemBtn = DOM.create('button', {
                        className: 'rd-action-btn rd-page-unrestrict', textContent: 'Queue',
                        dataset: { url: link.url },
                        onClick: () => {
                            State.currentTab = 'links';
                            UI.renderDashboard();
                            if (link.url.startsWith('magnet:')) addMagnet(link.url);
                            else unrestrictLinkOrFolder(link.url);
                        }
                    });

                    const item = DOM.create('div', { className: 'rd-log-item' }, [
                        chk,
                        DOM.create('div', { className: 'rd-item-content' }, [
                            DOM.create('div', { className: 'rd-filename', title: link.url, textContent: icon + ' ' + link.text }),
                            DOM.create('div', { style: 'font-size:10px; color:var(--rd-text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;', textContent: link.url }),
                            DOM.create('div', { className: 'rd-btn-group' }, [oneClickBtn, queueItemBtn])
                        ])
                    ]);
                    groupContent.append(item);
                }

                logList.append(groupHeader, groupContent);
            }

            area.append(controlBar, logList);
        },

        refresh() {
            this.render(); // Page tab always fully rebuilds
        }
    };

    Tabs.Torrents = {
        _pollingInterval: null,

        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            // Control bar
            const controlBar = DOM.create('div', { className: 'rd-control-bar', style: 'flex-direction:column; align-items:stretch;' });
            const topRow = DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:center; width:100%;' });

            const leftGroup = DOM.create('div', { className: 'rd-control-group' });
            const selectAllLabel = DOM.create('label', { style: 'display:flex; align-items:center; gap:5px; font-size:12px; cursor:pointer; font-weight:600;' });
            const selectAllChk = DOM.create('input', { type: 'checkbox', id: 'rd-torrent-chk-all', className: 'rd-checkbox' });
            selectAllChk.addEventListener('change', () => document.querySelectorAll('.rd-torrent-chk').forEach(c => c.checked = selectAllChk.checked));
            selectAllLabel.append(selectAllChk, DOM.text('All'));

            const delSelBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete', style: 'margin:0;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-torrent-chk:checked')).map(c => c.value);
                    if (!sel.length) return;
                    if (confirm('Delete ' + sel.length + ' torrents?')) {
                        sel.forEach(id => deleteTorrent(id));
                    }
                }
            });
            leftGroup.append(selectAllLabel, delSelBtn);

            const cleanBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Clean Dead', style: 'margin:0;',
                onClick: () => cleanupTorrents()
            });
            topRow.append(leftGroup, cleanBtn);

            const searchInput = DOM.create('input', {
                type: 'text', id: 'rd-search-torrents', className: 'rd-search-bar',
                placeholder: 'Search Torrents...', style: 'margin:0; margin-top:8px;',
                onInput: (e) => this._renderList(e.target.value)
            });
            controlBar.append(topRow, searchInput);

            const listContainer = DOM.create('div', { id: 'rd-torrent-list-container', className: 'rd-log-list' });
            area.append(controlBar, listContainer);
            addPullToRefresh(listContainer, () => this._fetchTorrents(true));
            this._renderList('');
            this.startPolling();
        },

        refresh() {
            const searchInput = document.getElementById('rd-search-torrents');
            const filter = searchInput ? searchInput.value : '';
            this._renderList(filter);
        },

        _renderList(filterText) {
            const container = document.getElementById('rd-torrent-list-container');
            if (!container) return;
            DOM.clear(container);

            if (State.cachedTorrents.length === 0) {
                container.append(DOM.create('div', { style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);', textContent: 'No active torrents.' }));
                return;
            }

            let filtered = State.cachedTorrents;
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter(t => t.filename.toLowerCase().includes(lf));
            }

            for (const t of filtered) {
                container.append(this._buildTorrentItem(t));
            }
        },

        _buildTorrentItem(t) {
            const isDone = t.status === 'downloaded';
            const isError = t.status === 'error' || t.status === 'dead';
            const color = isDone ? 'var(--rd-success)' : (isError ? 'var(--rd-danger)' : 'var(--rd-warning)');
            const progWidth = isDone ? 100 : (t.progress || 0);
            const totalGB = formatBytes(t.bytes || 0);
            const dlBytes = (t.bytes || 0) * ((t.progress || 0) / 100);

            // Metrics (speed + ETA)
            const metricsChildren = [];
            if (!isDone && t.speed > 0) {
                const speedMB = (t.speed / 1024 / 1024).toFixed(1) + ' MB/s';
                const bytesLeft = (t.bytes || 0) - dlBytes;
                const secLeft = bytesLeft / t.speed;
                const eta = secLeft > 0 ? Math.floor(secLeft / 60) + 'm ' + Math.floor(secLeft % 60) + 's' : '';
                metricsChildren.push(DOM.create('div', {
                    style: 'font-size:10px; color:var(--rd-text-secondary); margin-top:2px;',
                    textContent: '\u2B07 ' + speedMB + (eta ? ' | ETA ' + eta : '')
                }));
            }

            // Action buttons
            const actionChildren = [];
            if (isDone && t.links && t.links.length > 0) {
                if (t.links.length === 1) {
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge', textContent: '1 File',
                        dataset: { link: t.links[0] },
                        onClick: () => { State.currentTab = 'links'; UI.renderDashboard(); unrestrictLink(t.links[0], false); }
                    }));
                } else {
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge m3u', textContent: 'M3U',
                        onClick: () => generateM3U(t.filename, t.links)
                    }));
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge', textContent: 'All (' + t.links.length + ')',
                        onClick: () => { State.currentTab = 'links'; UI.renderDashboard(); processQueue([...t.links], 'queue'); }
                    }));
                }
            }
            actionChildren.push(DOM.create('span', {
                style: 'color:var(--rd-danger); font-weight:bold; font-size:18px; padding:0 4px; cursor:pointer;',
                textContent: '\u2715',
                onClick: () => deleteTorrent(t.id)
            }));

            const chk = DOM.create('input', { type: 'checkbox', className: 'rd-torrent-chk rd-checkbox', value: t.id });

            // Progress bar
            const progressTrack = DOM.create('div', { className: 'rd-progress-track' });
            const progressFill = DOM.create('div', { className: 'rd-progress-fill', style: 'width:' + progWidth + '%; background:' + color + ';' });
            progressTrack.append(progressFill);

            return DOM.create('div', { className: 'rd-log-item' + (isDone ? ' success' : '') }, [
                chk,
                DOM.create('div', { className: 'rd-item-content' }, [
                    DOM.create('div', { className: 'rd-filename', title: t.filename, style: 'color:' + color + ';', textContent: t.filename }),
                    DOM.create('div', { className: 'rd-meta' }, [
                        DOM.create('span', { textContent: t.status }),
                        DOM.create('span', { textContent: isDone ? totalGB : formatBytes(dlBytes) + ' / ' + totalGB })
                    ]),
                    ...metricsChildren,
                    progressTrack
                ]),
                DOM.create('div', { className: 'rd-item-actions', style: 'flex-direction:column;' }, actionChildren)
            ]);
        },

        startPolling() {
            this.stopPolling();
            if (State.apiKey && !document.hidden) {
                this._fetchTorrents(true);
                this._pollingInterval = setInterval(() => this._fetchTorrents(false), 4000);
            }
        },

        stopPolling() {
            if (this._pollingInterval) { clearInterval(this._pollingInterval); this._pollingInterval = null; }
        },

        async _fetchTorrents(forceRender) {
            if (State.currentTab !== 'torrents') return;
            const { ok, data } = await API.get('/torrents');
            if (!ok || !data) {
                loadOfflineData('rd_cached_torrents', 'cachedTorrents');
                this.refresh();
                return;
            }

            State.cachedTorrents = data;

            // Auto cleanup
            if (State.settings.autoCleanup) {
                const toDelete = data.filter(t => t.status === 'dead' || t.status === 'error');
                if (toDelete.length > 0) {
                    toDelete.forEach(t => API.del('/torrents/delete/' + t.id));
                    State.cachedTorrents = data.filter(t => t.status !== 'dead' && t.status !== 'error');
                }
            }

            // Detect newly completed torrents
            State.cachedTorrents.forEach(t => {
                if (t.status === 'downloaded' && !State.completedTorrentsMemory.has(t.id)) {
                    State.completedTorrentsMemory.add(t.id);
                    if (!State.isFirstTorrentFetch) {
                        GM_notification({ title: 'RD Download Ready', text: t.filename, timeout: 4000 });
                        if (typeof playNotificationChime === 'function') playNotificationChime();
                    }
                }
            });
            State.isFirstTorrentFetch = false;

            // Cache for offline
            GM_setValue('rd_cached_torrents', JSON.stringify(State.cachedTorrents));

            this.refresh();
        }
    };

    Tabs.Cloud = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);
            area.append(DOM.create('div', { style: 'text-align:center; padding:16px; color:var(--rd-text-secondary);', textContent: 'Loading…' }));
            this._fetchCloud();
        },

        refresh() {
            const searchInput = document.getElementById('rd-search-cloud');
            const filter = searchInput ? searchInput.value : '';
            this._renderList(filter);
        },

        async _fetchCloud() {
            const { ok, data, error } = await API.get('/downloads?limit=100');
            if (State.currentTab !== 'cloud') return;
            if (!ok) {
                if (loadOfflineData('rd_cached_cloud', 'cachedCloud')) {
                    this._renderBase();
                } else {
                    const area = document.getElementById('rd-content-area');
                    if (area) { DOM.clear(area); area.append(DOM.create('div', { style: 'padding:16px; color:var(--rd-danger);', textContent: 'Error: ' + error })); }
                }
                return;
            }
            State.cachedCloud = data || [];
            GM_setValue('rd_cached_cloud', JSON.stringify(State.cachedCloud));
            this._renderBase();
        },

        _renderBase() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            if (State.cachedCloud.length === 0) {
                area.append(DOM.create('div', { style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);', textContent: 'Cloud history empty.' }));
                return;
            }

            // Control bar
            const controlBar = DOM.create('div', { className: 'rd-control-bar', style: 'flex-direction:column; align-items:stretch;' });
            const topRow = DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:center; width:100%;' });

            const leftGroup = DOM.create('div', { className: 'rd-control-group' });
            const selectAllLabel = DOM.create('label', { style: 'display:flex; align-items:center; gap:5px; font-size:12px; cursor:pointer; font-weight:600;' });
            const selectAllChk = DOM.create('input', { type: 'checkbox', id: 'rd-cloud-chk-all', className: 'rd-checkbox' });
            selectAllChk.addEventListener('change', () => document.querySelectorAll('.rd-cloud-chk').forEach(c => c.checked = selectAllChk.checked));
            selectAllLabel.append(selectAllChk, DOM.text('All'));

            const delSelBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete', style: 'margin:0;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-cloud-chk:checked')).map(c => c.value);
                    if (!sel.length) return;
                    if (confirm('Delete ' + sel.length + ' files from cloud?')) {
                        sel.forEach(id => deleteCloudItem(id));
                    }
                }
            });
            leftGroup.append(selectAllLabel, delSelBtn);
            topRow.append(leftGroup, buildExportControls('cloud'));

            const bottomRow = DOM.create('div', { style: 'display:flex; gap:6px; align-items:center; margin-top:8px;' });
            const searchInput = DOM.create('input', {
                type: 'text', id: 'rd-search-cloud', className: 'rd-search-bar',
                placeholder: 'Search Cloud...', style: 'margin:0; flex:1;',
                onInput: () => this._renderList(searchInput.value)
            });
            const sortSelect = DOM.create('select', { id: 'rd-cloud-sort', className: 'rd-select', style: 'padding:6px; margin:0;' });
            ['newest:Newest', 'oldest:Oldest', 'largest:Largest', 'smallest:Smallest'].forEach(opt => {
                const [val, label] = opt.split(':');
                sortSelect.append(DOM.create('option', { value: val, textContent: label }));
            });
            sortSelect.addEventListener('change', () => this._renderList(searchInput.value));
            bottomRow.append(searchInput, sortSelect);

            controlBar.append(topRow, bottomRow);

            const listContainer = DOM.create('div', { id: 'rd-cloud-list-container', className: 'rd-log-list' });
            area.append(controlBar, listContainer);
            addPullToRefresh(listContainer, () => this._fetchCloud());
            this._renderList('');
        },

        _renderList(filterText) {
            const container = document.getElementById('rd-cloud-list-container');
            if (!container) return;
            DOM.clear(container);

            let filtered = [...State.cachedCloud];
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter(item => item.filename.toLowerCase().includes(lf));
            }

            const sortMode = document.getElementById('rd-cloud-sort')?.value || 'newest';
            filtered.sort((a, b) => {
                if (sortMode === 'newest') return new Date(b.generated) - new Date(a.generated);
                if (sortMode === 'oldest') return new Date(a.generated) - new Date(b.generated);
                if (sortMode === 'largest') return b.filesize - a.filesize;
                return a.filesize - b.filesize;
            });

            for (const item of filtered) {
                const isMedia = /\.(mp4|mkv|avi|mov|mp3|flac|wav|jpg|png|webp)$/i.test(item.filename);
                const btns = [
                    DOM.create('button', { className: 'rd-action-btn', textContent: 'DL', onClick: () => window.open(item.download, '_blank') }),
                    DOM.create('button', { className: 'rd-action-btn', textContent: 'URL', onClick: () => UI.copyToClipboard(item.download) })
                ];
                if (isMedia) {
                    btns.push(DOM.create('button', {
                        className: 'rd-action-btn', textContent: 'Play',
                        onClick: () => {
                            if (State.settings.extPlayer === 'browser' && typeof Media !== 'undefined') Media.open(item.download, item.filename);
                            else window.open(getStreamUrl(item.download), '_self');
                        }
                    }));
                }

                const chk = DOM.create('input', { type: 'checkbox', className: 'rd-cloud-chk rd-checkbox', value: item.id, dataset: { url: item.download } });
                const delBtn = DOM.create('span', {
                    style: 'color:var(--rd-danger); cursor:pointer; padding:0 4px; font-size:16px; font-weight:bold;',
                    textContent: '\u2715',
                    onClick: () => deleteCloudItem(item.id)
                });

                container.append(DOM.create('div', { className: 'rd-log-item success' }, [
                    chk,
                    DOM.create('div', { className: 'rd-item-content' }, [
                        DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:flex-start;' }, [
                            DOM.create('div', { className: 'rd-filename', title: item.filename, style: 'flex:1;', textContent: item.filename }),
                            delBtn
                        ]),
                        DOM.create('div', { className: 'rd-meta' }, [
                            DOM.create('span', { textContent: formatBytes(item.filesize) }),
                            DOM.create('span', { textContent: new Date(item.generated).toLocaleDateString() })
                        ]),
                        DOM.create('div', { className: 'rd-btn-group' }, btns)
                    ])
                ]));
            }
        }
    };

    function playNotificationChime() {
        if (!State.settings.notificationSound) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch(e) {}
    }

    Tabs.Settings = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            // Show loading while fetching
            area.append(DOM.create('div', { style: 'text-align:center; padding:16px; color:var(--rd-text-secondary);', textContent: 'Loading…' }));

            // Fetch user + traffic data if not cached
            if (State.userProfile && State.trafficData) {
                this._renderView(area);
            } else {
                this._fetchAndRender(area);
            }
        },

        refresh() { this.render(); },

        async _fetchAndRender(area) {
            const userRes = await API.get('/user');
            if (State.currentTab !== 'settings') return;
            if (!userRes.ok) { DOM.clear(area); area.append(DOM.create('div', { style: 'padding:16px; color:var(--rd-danger);', textContent: 'Failed to load account info' })); return; }
            State.userProfile = userRes.data;

            const trafficRes = await API.get('/traffic');
            if (State.currentTab !== 'settings') return;
            if (trafficRes.ok) State.trafficData = trafficRes.data;

            this._renderView(area);
        },

        _renderView(area) {
            DOM.clear(area);
            const user = State.userProfile;
            const traffic = State.trafficData;
            if (!user) return;

            const wrapper = DOM.create('div', { style: 'padding:16px;' });

            // --- Account Card ---
            const card = DOM.create('div', { style: 'background:var(--rd-bg-glass); border-radius:var(--rd-radius-md); padding:16px; margin-bottom:16px; border:1px solid var(--rd-glass-border); box-shadow:var(--rd-shadow-sm);' });

            const cardTop = DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:center;' });
            const userInfo = DOM.create('div');
            userInfo.append(
                DOM.create('div', { style: 'font-size:16px; font-weight:bold;', textContent: user.username }),
                DOM.create('div', { style: 'color:var(--rd-text-secondary); font-size:12px; margin-top:2px;', textContent: user.email })
            );
            const daysLeft = user.expiration ? Math.max(0, Math.ceil((new Date(user.expiration) - new Date()) / 86400000)) : 0;
            const statusInfo = DOM.create('div', { style: 'text-align:right;' });
            statusInfo.append(
                DOM.create('div', { style: 'font-size:14px; font-weight:bold; color:' + (daysLeft > 0 ? 'var(--rd-success)' : 'var(--rd-danger)') + ';', textContent: user.type.toUpperCase() }),
                DOM.create('div', { style: 'font-size:11px; color:var(--rd-text-secondary); margin-top:2px;', textContent: daysLeft + ' Days Left' })
            );
            cardTop.append(userInfo, statusInfo);
            card.append(cardTop);

            // Points
            card.append(DOM.create('div', { style: 'font-size:12px; color:var(--rd-text-secondary); margin-top:8px;', textContent: 'Fidelity Points: ' + user.points }));
            if (user.points >= 1000) {
                card.append(DOM.create('button', {
                    className: 'rd-action-btn', textContent: 'Convert 1000 Points to 30 Days',
                    style: 'background:var(--rd-warning); color:var(--rd-bg-base); margin-top:10px; width:100%; padding:8px; font-size:12px; font-weight:bold;',
                    onClick: () => convertPoints()
                }));
            }

            // Traffic quotas
            if (traffic) {
                const quotaEntries = Object.entries(traffic).filter(([, d]) => d.limit && d.limit > 0);
                if (quotaEntries.length > 0) {
                    const quotaSection = DOM.create('div', { style: 'margin-top:14px; border-top:1px solid var(--rd-glass-border); padding-top:12px;' });
                    quotaSection.append(DOM.create('div', { style: 'font-weight:bold; margin-bottom:10px; font-size:12px;', textContent: 'Daily Host Quotas' }));
                    for (const [host, d] of quotaEntries) {
                        const pct = ((d.limit - d.left) / d.limit) * 100;
                        const usedGB = ((d.limit - d.left) / 1073741824).toFixed(1);
                        const limitGB = (d.limit / 1073741824).toFixed(1);
                        const row = DOM.create('div', { style: 'margin-bottom:8px; font-size:11px;' });
                        row.append(
                            DOM.create('div', { style: 'display:flex; justify-content:space-between; margin-bottom:3px; color:var(--rd-text-secondary);' }, [
                                DOM.create('span', { textContent: host }),
                                DOM.create('span', { textContent: usedGB + ' / ' + limitGB + ' GB' })
                            ]),
                            DOM.create('div', { className: 'rd-progress-track' }, [
                                DOM.create('div', { className: 'rd-progress-fill', style: 'width:' + pct + '%; background:var(--rd-accent);' })
                            ])
                        );
                        quotaSection.append(row);
                    }
                    card.append(quotaSection);
                }
            }
            wrapper.append(card);

            // --- Preferences ---
            wrapper.append(DOM.create('div', { style: 'font-size:14px; font-weight:bold; margin-bottom:8px; color:var(--rd-success);', textContent: 'Preferences' }));

            // Toggle settings
            const toggleSettings = [
                { key: 'hijack', label: 'Hijack Native Links', desc: 'Clicking host links auto-routes to RD' },
                { key: 'autoShow', label: 'Auto-Show Dashboard' },
                { key: 'autoCleanup', label: 'Auto-Clean Dead Torrents' },
                { key: 'smartFilter', label: 'Smart Extension Filter' },
                { key: 'notificationSound', label: 'Notification Sound' },
                { key: 'deepScan', label: 'Deep Scan (iframes)', desc: 'Scan links inside iframes — slower' }
            ];
            for (const setting of toggleSettings) {
                wrapper.append(this._buildToggleRow(setting));
            }

            // Dropdown settings
            wrapper.append(this._buildSelectRow('Magnet Add Action', 'magnetAction', [
                ['smart', 'Smart Filter (Auto)'], ['video', 'Largest Video Only'], ['all', 'Download All'], ['manual', 'Manual Selection']
            ]));
            wrapper.append(this._buildSelectRow('Video Player', 'extPlayer', [
                ['browser', 'Web Player'], ['vlc', 'VLC App'], ['iina', 'IINA (Mac)'], ['infuse', 'Infuse (Apple)']
            ]));
            wrapper.append(this._buildSelectRow('Default File Action', 'defaultAction', [
                ['dl', 'Download File'], ['copy', 'Copy to Clipboard'], ['list', 'Add to List Only']
            ]));
            wrapper.append(this._buildSelectRow('Export Format', 'exportFormat', [
                ['raw', 'Plain Text'], ['curl', 'cURL'], ['wget', 'Wget']
            ]));

            // Text inputs
            wrapper.append(this._buildTextRow('Smart Filter Extensions', 'filterExts', State.settings.filterExts));
            wrapper.append(this._buildTextRow('Custom Hosts (comma separated)', 'customHosts', State.settings.customHosts, () => { Config.hostRegex = Config.getActiveRegex(); }));

            // Import/Export
            wrapper.append(DOM.create('div', { style: 'font-size:14px; font-weight:bold; margin:16px 0 8px; color:var(--rd-accent);', textContent: 'Backup' }));
            const backupRow = DOM.create('div', { style: 'display:flex; gap:8px;' });
            backupRow.append(
                DOM.create('button', { className: 'rd-input-btn', textContent: 'Export Settings', style: 'flex:1;', onClick: () => this._exportSettings() }),
                DOM.create('button', { className: 'rd-input-btn', textContent: 'Import Settings', style: 'flex:1;', onClick: () => this._importSettings() })
            );
            wrapper.append(backupRow);

            // Logout
            wrapper.append(DOM.create('button', {
                className: 'rd-action-btn', textContent: 'Log Out',
                style: 'background:var(--rd-danger); color:var(--rd-bg-base); padding:10px; width:100%; font-size:13px; font-weight:bold; margin-top:24px;',
                onClick: () => { if (confirm('Logout?')) { Config.clearKey(); location.reload(); } }
            }));

            area.append(wrapper);
        },

        _buildToggleRow({ key, label, desc }) {
            const row = DOM.create('div', { className: 'rd-account-row', style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--rd-glass-border); font-size:12px;' });
            const labelEl = DOM.create('span');
            labelEl.append(DOM.text(label));
            if (desc) labelEl.append(DOM.create('br'), DOM.create('span', { style: 'font-size:10px; color:var(--rd-text-secondary); font-weight:normal;', textContent: desc }));

            const toggle = DOM.create('label', { className: 'rd-toggle' });
            const input = DOM.create('input', { type: 'checkbox' });
            input.checked = !!State.settings[key];
            input.addEventListener('change', () => { State.settings[key] = input.checked; saveSettings(); UI.showToast('Settings Saved'); });
            const slider = DOM.create('span', { className: 'rd-slider' });
            toggle.append(input, slider);

            row.append(labelEl, toggle);
            return row;
        },

        _buildSelectRow(label, key, options) {
            const row = DOM.create('div', { className: 'rd-account-row', style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--rd-glass-border); font-size:12px;' });
            row.append(DOM.create('span', { textContent: label }));
            const select = DOM.create('select', { className: 'rd-select' });
            for (const [val, text] of options) {
                const opt = DOM.create('option', { value: val, textContent: text });
                if (State.settings[key] === val) opt.selected = true;
                select.append(opt);
            }
            select.addEventListener('change', () => { State.settings[key] = select.value; saveSettings(); UI.showToast(label + ' Updated'); });
            row.append(select);
            return row;
        },

        _buildTextRow(label, key, value, onChange) {
            const row = DOM.create('div', { style: 'display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:12px 0; border-bottom:1px solid var(--rd-glass-border); font-size:12px;' });
            row.append(DOM.create('span', { textContent: label }));
            const input = DOM.create('input', { type: 'text', className: 'rd-search-bar', value: value || '' });
            input.addEventListener('input', () => { State.settings[key] = input.value; saveSettings(); if (onChange) onChange(); });
            row.append(input);
            return row;
        },

        _exportSettings() {
            const data = { settings: State.settings, apiKey: State.apiKey };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = DOM.create('a', { href: url, download: 'rd-settings-backup.json' });
            a.click();
            URL.revokeObjectURL(url);
            UI.showToast('Settings Exported');
        },

        _importSettings() {
            const input = DOM.create('input', { type: 'file', accept: '.json' });
            input.addEventListener('change', () => {
                const file = input.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const data = JSON.parse(reader.result);
                        if (!data.settings) throw new Error('Invalid format');
                        if (!confirm('Import these settings? This will overwrite your current settings.')) return;
                        // Validate and apply
                        for (const key of Object.keys(Config.defaultSettings)) {
                            if (data.settings.hasOwnProperty(key)) State.settings[key] = data.settings[key];
                        }
                        saveSettings();
                        if (data.apiKey) Config.saveKey(data.apiKey);
                        UI.showToast('Settings Imported!');
                        setTimeout(() => location.reload(), 800);
                    } catch(e) {
                        UI.showToast('Invalid settings file', 'error');
                    }
                };
                reader.readAsText(file);
            });
            input.click();
        }
    };


const Scanner = {
    _xrayTimer: null,
    _scanTimer: null,
    _observer: null,

    init() {
        if (!State.apiKey) return;

        // Fetch hosts
        API.get('/hosts/domains').then(({ ok, data }) => {
            if (ok && Array.isArray(data)) {
                State.dynamicHosts = data;
                GM_setValue('rd_dynamic_hosts', JSON.stringify(data));
                Config.hostRegex = Config.getActiveRegex();
            }
        });
        API.get('/hosts/status').then(({ ok, data }) => {
            if (ok && data) State.liveHosts = data;
        });

        // MutationObserver
        this._observer = new MutationObserver((mutations) => {
            if (mutations.some(m => m.addedNodes.length)) {
                clearTimeout(this._scanTimer);
                if (typeof requestIdleCallback !== 'undefined') {
                    requestIdleCallback(() => this.scanPage());
                } else {
                    this._scanTimer = setTimeout(() => this.scanPage(), 300);
                }
            }
        });
        this._observer.observe(document.body, { childList: true, subtree: true });

        // SPA navigation detection
        State.lastUrl = location.href;
        setInterval(() => {
            if (location.href !== State.lastUrl) {
                State.lastUrl = location.href;
                State.scannedLinksMap.clear();
                State.processedUrls.clear();
                document.querySelectorAll('.rd-inline-icon').forEach(el => el.remove());
                document.querySelectorAll('.rd-processed').forEach(el => el.classList.remove('rd-processed'));
                UI.updateBadge(0);
                this.scanPage();
            }
        }, 1000);

        // Initial scan
        this.scanPage();

        // Selection tooltip
        this._initSelectionTooltip();
    },

    scanPage() {
        this._scanDocument(document);
        // Deep scan iframes if enabled
        if (State.settings.deepScan) {
            document.querySelectorAll('iframe').forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc) this._scanDocument(iframeDoc);
                } catch(e) { /* cross-origin, skip */ }
            });
        }
    },

    _scanDocument(doc) {
        let newFound = false;
        doc.querySelectorAll('a:not(.rd-processed)').forEach(link => {
            let url = link.href;
            let text = (link.innerText || '').trim() || url;
            if (!url) return;

            if (url.startsWith('magnet:')) {
                link.classList.add('rd-processed');
                const icon = this.injectIcon(link, '\u{1F9F2}', () => {
                    UI.toggleDashboard(true);
                    State.currentTab = 'links';
                    UI.renderDashboard();
                    addMagnet(url);
                }, url);
                this.checkMagnetCache(url, icon);
                if (State.settings.hijack) {
                    link.addEventListener('click', (e) => { e.preventDefault(); addMagnet(url); });
                }
                if (!State.scannedLinksMap.has(url)) {
                    State.scannedLinksMap.set(url, { type: 'magnet', text: text.substring(0, 45) });
                }
                newFound = true;
            } else if (Config.hostRegex && Config.hostRegex.test(url) && !link.querySelector('img')) {
                link.classList.add('rd-processed');
                // Check host status
                let hostDomain;
                try { hostDomain = new URL(url).hostname.replace('www.', ''); } catch(e) { return; }
                const hostObj = Object.values(State.liveHosts).find(h => hostDomain.includes(h.id) || hostDomain.includes((h.name || '').toLowerCase()));
                const isDown = hostObj && hostObj.status === 'down';

                if (isDown) {
                    this.injectIcon(link, '\u274C', () => UI.showToast((hostObj.name || hostDomain) + ' is offline', 'error'), url, 'error');
                } else {
                    const icon = this.injectIcon(link, '\u26A1', () => {
                        UI.toggleDashboard(true);
                        State.currentTab = 'links';
                        UI.renderDashboard();
                        unrestrictLinkOrFolder(url);
                    }, url);
                    // X-ray tooltip on hover
                    this._setupXray(icon, url);
                    // Hijack
                    if (State.settings.hijack) {
                        link.addEventListener('click', (e) => {
                            if (!e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                                UI.toggleDashboard(true);
                                State.currentTab = 'links';
                                UI.renderDashboard();
                                unrestrictLinkOrFolder(url);
                            }
                        });
                    }
                    if (!State.scannedLinksMap.has(url)) {
                        State.scannedLinksMap.set(url, { type: 'host', text: text.substring(0, 45) });
                    }
                }
                newFound = true;
            }
        });
        if (newFound) {
            UI.updateBadge(State.scannedLinksMap.size);
            if (State.currentTab === 'page' && State.isExpanded) Tabs.Page.refresh();
        }
    },

    injectIcon(target, text, handler, linkUrl, extraClass = '') {
        const icon = DOM.create('span', {
            className: 'rd-inline-icon ' + extraClass,
            textContent: text,
            title: extraClass === 'error' ? '' : 'Unrestrict (Right-click to copy)',
            onClick: (e) => { e.preventDefault(); e.stopPropagation(); handler(); },
            onContextmenu: (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (extraClass === 'error') return;
                const ogText = icon.textContent;
                icon.textContent = '\u23F3'; // hourglass
                if (text === '\u{1F9F2}') { // magnet
                    addMagnet(linkUrl, () => { icon.textContent = '\u2705'; setTimeout(() => icon.textContent = ogText, 1500); });
                } else {
                    unrestrictLinkOrFolder(linkUrl, true, null, (finalUrl) => {
                        if (finalUrl) UI.copyToClipboard(finalUrl);
                        icon.textContent = '\u{1F4CB}'; // clipboard
                        setTimeout(() => icon.textContent = ogText, 1500);
                    });
                }
            }
        });

        target.parentNode.insertBefore(icon, target.nextSibling);

        // Magnet tooltip
        if (text === '\u{1F9F2}') {
            icon.addEventListener('mouseenter', () => { if (icon.dataset.cache) this._showTooltip(icon, icon.dataset.cache); });
            icon.addEventListener('mouseleave', () => this._hideTooltip());
        }

        return icon;
    },

    checkMagnetCache(magnetLink, iconElement) {
        const hashMatch = magnetLink.match(/xt=urn:btih:([a-zA-Z0-9]+)/i);
        if (!hashMatch) return;
        const hash = hashMatch[1].toLowerCase();
        State.magnetCacheQueue.push({ hash, el: iconElement });

        clearTimeout(State.cacheCheckTimer);
        State.cacheCheckTimer = setTimeout(async () => {
            if (State.magnetCacheQueue.length === 0) return;
            const batch = [...State.magnetCacheQueue];
            State.magnetCacheQueue = [];
            const hashes = batch.map(b => b.hash).join('/');
            const { ok, data } = await API.get('/torrents/instantAvailability/' + hashes);
            if (!ok || !data) return;
            batch.forEach(item => {
                const hostData = data[item.hash];
                if (hostData && hostData.rd && hostData.rd.length > 0) {
                    item.el.classList.add('cached');
                    item.el.textContent = '\u{1F7E2} \u{1F9F2}'; // green circle + magnet
                    item.el.dataset.cache = 'Cached';
                } else {
                    item.el.classList.add('uncached');
                    item.el.textContent = '\u{1F7E1} \u{1F9F2}'; // yellow circle + magnet
                    item.el.dataset.cache = 'Uncached';
                }
            });
        }, 500);
    },

    _setupXray(icon, url) {
        let timer;
        icon.addEventListener('mouseenter', () => {
            if (icon.dataset.xray) return this._showTooltip(icon, icon.dataset.xray);
            timer = setTimeout(async () => {
                const ogText = icon.textContent;
                icon.textContent = '\u23F3';
                const { ok, data } = await API.post('/unrestrict/check', { link: url });
                icon.textContent = ogText;
                if (ok && data && data.supported) {
                    const size = data.filesize ? formatBytes(data.filesize) : 'Unknown Size';
                    icon.dataset.xray = data.filename + ' \u2014 ' + size;
                } else {
                    icon.dataset.xray = 'Unsupported';
                }
                this._showTooltip(icon, icon.dataset.xray);
            }, 500);
        });
        icon.addEventListener('mouseleave', () => {
            clearTimeout(timer);
            this._hideTooltip();
        });
    },

    _showTooltip(el, text) {
        const tooltip = document.getElementById('rd-xray-tooltip');
        if (!tooltip) return;
        tooltip.textContent = text;
        const rect = el.getBoundingClientRect();
        tooltip.style.top = (rect.top + window.scrollY) + 'px';
        tooltip.style.left = (rect.left + window.scrollX + rect.width / 2) + 'px';
        tooltip.style.transform = 'translate(-50%, -100%)';
        tooltip.classList.add('visible');
    },

    _hideTooltip() {
        const tooltip = document.getElementById('rd-xray-tooltip');
        if (tooltip) tooltip.classList.remove('visible');
    },

    _initSelectionTooltip() {
        document.addEventListener('selectionchange', () => {
            if (!State.apiKey) return;
            const sel = window.getSelection();
            const rawText = (sel.toString() || '').trim();
            const decoded = decodeBase64Heuristic(rawText);
            const selTooltip = document.getElementById('rd-sel-tooltip');
            if (!selTooltip) return;

            if (decoded && decoded.match(/(https?:\/\/[^\s]+|magnet:\?[^\s]+)/i)) {
                try {
                    const rect = sel.getRangeAt(0).getBoundingClientRect();
                    selTooltip.style.top = (rect.top + window.scrollY) + 'px';
                    selTooltip.style.left = (rect.left + window.scrollX + rect.width / 2) + 'px';
                    selTooltip.classList.add('show');
                    selTooltip.dataset.content = decoded;
                } catch(e) {}
            } else {
                selTooltip.classList.remove('show');
            }
        });

        // Click handler for selection tooltip
        document.addEventListener('click', (e) => {
            const selTooltip = document.getElementById('rd-sel-tooltip');
            if (selTooltip && e.target.closest('#rd-sel-tooltip')) {
                const content = selTooltip.dataset.content;
                if (content) {
                    if (!State.isExpanded) UI.toggleDashboard(true);
                    State.currentTab = 'links';
                    UI.renderDashboard();
                    handleManualInput(content);
                    selTooltip.classList.remove('show');
                }
            }
        });
    }
};


const Media = {
    _objectUrls: [],
    _playlist: null,
    _playlistIndex: 0,
    _keyHandler: null,

    open(url, filename, playlist = null) {
        this.close(); // Clean up any existing player

        this._playlist = playlist; // Array of { url, filename } or null
        this._playlistIndex = 0;

        const win = DOM.create('div', { id: 'rd-media-window' });

        // Determine media type
        const isVideo = /\.(mp4|mkv|webm|mov|avi)$/i.test(filename);
        const isAudio = /\.(mp3|flac|wav|ogg)$/i.test(filename);
        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);

        // Build header
        const controls = DOM.create('div', { className: 'rd-media-controls' });

        // Playlist prev/next
        if (playlist && playlist.length > 1) {
            controls.append(
                DOM.create('span', { className: 'rd-media-btn', textContent: '\u23EE', title: 'Previous', onClick: () => this._playlistPrev() }),
                DOM.create('span', { className: 'rd-media-btn', textContent: '\u23ED', title: 'Next', onClick: () => this._playlistNext() })
            );
        }

        // PiP button (video only)
        if (isVideo && document.pictureInPictureEnabled) {
            controls.append(DOM.create('span', {
                className: 'rd-media-btn', id: 'rd-media-pip', textContent: '\u23CF\uFE0F', title: 'PiP',
                onClick: async () => {
                    const vid = document.getElementById('rd-cinema-player');
                    if (!vid) return;
                    if (document.pictureInPictureElement) await document.exitPictureInPicture();
                    else await vid.requestPictureInPicture();
                }
            }));
        }

        // Fullscreen toggle
        const maxBtn = DOM.create('span', {
            className: 'rd-media-btn', id: 'rd-media-max', textContent: '\u{1F5D4}', title: 'Fullscreen',
            onClick: () => {
                win.classList.toggle('rd-fullscreen');
                maxBtn.textContent = win.classList.contains('rd-fullscreen') ? '\u{1F5D7}' : '\u{1F5D4}';
            }
        });
        controls.append(maxBtn);

        // Close button
        controls.append(DOM.create('span', {
            className: 'rd-media-btn', style: 'color:var(--rd-danger);', textContent: '\u2715', title: 'Close',
            onClick: () => this.close()
        }));

        const header = DOM.create('div', { id: 'rd-media-drag-handle' }, [
            DOM.create('span', { style: 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;', textContent: filename }),
            controls
        ]);
        win.append(header);

        // Build media content
        if (isVideo) {
            const video = DOM.create('video', {
                id: 'rd-cinema-player', src: url,
                style: 'width:100%; height:calc(100% - 42px); background:black;'
            });
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            // Restore volume
            video.volume = parseFloat(GM_getValue('rd_volume', '1'));
            video.addEventListener('volumechange', () => GM_setValue('rd_volume', String(video.volume)));
            // Auto-advance playlist
            if (playlist && playlist.length > 1) {
                video.addEventListener('ended', () => this._playlistNext());
            }
            win.append(video);
        } else if (isAudio) {
            const audioContainer = DOM.create('div', { style: 'display:flex; flex-direction:column; justify-content:center; align-items:center; height:calc(100% - 42px); background:var(--rd-bg-glass);' });
            audioContainer.append(DOM.create('div', { style: 'font-size:48px; margin-bottom:12px;', textContent: '\u{1F3B5}' }));
            const audio = DOM.create('audio', { src: url, style: 'width:80%;' });
            audio.controls = true;
            audio.autoplay = true;
            audio.volume = parseFloat(GM_getValue('rd_volume', '1'));
            audio.addEventListener('volumechange', () => GM_setValue('rd_volume', String(audio.volume)));
            audioContainer.append(audio);
            win.append(audioContainer);
        } else if (isImage) {
            win.append(DOM.create('img', { src: url, style: 'width:100%; height:calc(100% - 42px); object-fit:contain; background:var(--rd-bg-glass);' }));
        } else {
            const fallback = DOM.create('div', { style: 'padding:24px; text-align:center;' });
            fallback.append(
                DOM.create('div', { textContent: 'Format not natively supported.' }),
                DOM.create('a', { href: url, target: '_blank', style: 'color:var(--rd-accent); margin-top:12px; display:inline-block; font-weight:bold;', textContent: 'Download File' })
            );
            win.append(fallback);
        }

        // Playlist panel (if applicable)
        if (playlist && playlist.length > 1) {
            win.append(this._buildPlaylistPanel(playlist));
        }

        document.body.appendChild(win);

        // Setup drag
        this._setupDrag(win, header);

        // Setup keyboard
        this._setupKeyboard(win);

        // Mobile: open fullscreen
        if (State.isMobile) {
            win.classList.add('rd-fullscreen');
        }
    },

    close() {
        const win = document.getElementById('rd-media-window');
        if (!win) return;
        // Pause media
        const video = win.querySelector('video');
        const audio = win.querySelector('audio');
        if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
        if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
        // Revoke object URLs
        this._objectUrls.forEach(u => URL.revokeObjectURL(u));
        this._objectUrls = [];
        // Remove keyboard handler
        if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
        win.remove();
    },

    _setupDrag(win, handle) {
        let isDragging = false, startX, startY;
        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.rd-media-btn')) return;
            isDragging = true;
            startX = e.clientX - win.offsetLeft;
            startY = e.clientY - win.offsetTop;
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (isDragging && !win.classList.contains('rd-fullscreen')) {
                win.style.left = (e.clientX - startX) + 'px';
                win.style.top = (e.clientY - startY) + 'px';
                win.style.bottom = 'auto';
                win.style.right = 'auto';
            }
        });
        document.addEventListener('mouseup', () => { isDragging = false; document.body.style.userSelect = ''; });

        // Touch drag
        let touchStartX, touchStartY;
        handle.addEventListener('touchstart', (e) => {
            if (e.target.closest('.rd-media-btn')) return;
            const touch = e.touches[0];
            touchStartX = touch.clientX - win.offsetLeft;
            touchStartY = touch.clientY - win.offsetTop;
        });
        handle.addEventListener('touchmove', (e) => {
            if (win.classList.contains('rd-fullscreen')) return;
            const touch = e.touches[0];
            win.style.left = (touch.clientX - touchStartX) + 'px';
            win.style.top = (touch.clientY - touchStartY) + 'px';
            win.style.bottom = 'auto';
            win.style.right = 'auto';
        });
    },

    _setupKeyboard(win) {
        this._keyHandler = (e) => {
            if (!document.getElementById('rd-media-window')) return;
            const video = document.getElementById('rd-cinema-player');
            const audio = win.querySelector('audio');
            const media = video || audio;
            if (!media) return;

            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    media.paused ? media.play() : media.pause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    media.currentTime = Math.max(0, media.currentTime - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    media.volume = Math.min(1, media.volume + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    media.volume = Math.max(0, media.volume - 0.1);
                    break;
                case 'f': case 'F':
                    win.classList.toggle('rd-fullscreen');
                    break;
                case 'p': case 'P':
                    if (video && document.pictureInPictureEnabled) {
                        if (document.pictureInPictureElement) document.exitPictureInPicture();
                        else video.requestPictureInPicture();
                    }
                    break;
                case 'm': case 'M':
                    media.muted = !media.muted;
                    break;
                case 'Escape':
                    if (win.classList.contains('rd-fullscreen')) win.classList.remove('rd-fullscreen');
                    else this.close();
                    break;
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    _buildPlaylistPanel(playlist) {
        const panel = DOM.create('div', {
            style: 'max-height:120px; overflow-y:auto; border-top:1px solid var(--rd-glass-border); background:var(--rd-bg-glass);'
        });
        playlist.forEach((item, idx) => {
            panel.append(DOM.create('div', {
                style: 'padding:6px 12px; font-size:11px; cursor:pointer; color:' + (idx === this._playlistIndex ? 'var(--rd-accent)' : 'var(--rd-text-secondary)') + '; border-bottom:1px solid var(--rd-glass-border);',
                textContent: (idx + 1) + '. ' + item.filename,
                onClick: () => this._playlistJump(idx)
            }));
        });
        return panel;
    },

    _playlistNext() {
        if (!this._playlist || this._playlistIndex >= this._playlist.length - 1) return;
        this._playlistIndex++;
        const item = this._playlist[this._playlistIndex];
        this._updateMediaSrc(item.url, item.filename);
    },

    _playlistPrev() {
        if (!this._playlist || this._playlistIndex <= 0) return;
        this._playlistIndex--;
        const item = this._playlist[this._playlistIndex];
        this._updateMediaSrc(item.url, item.filename);
    },

    _playlistJump(idx) {
        if (!this._playlist || idx < 0 || idx >= this._playlist.length) return;
        this._playlistIndex = idx;
        const item = this._playlist[idx];
        this._updateMediaSrc(item.url, item.filename);
    },

    _updateMediaSrc(url, filename) {
        const video = document.getElementById('rd-cinema-player');
        if (video) { video.src = url; video.play(); }
        const handle = document.getElementById('rd-media-drag-handle');
        if (handle) {
            const nameSpan = handle.querySelector('span');
            if (nameSpan) nameSpan.textContent = filename;
        }
        // Rebuild playlist panel highlighting
        const win = document.getElementById('rd-media-window');
        if (win && this._playlist) {
            const oldPanel = win.querySelector('div[style*="max-height:120px"]');
            if (oldPanel) { oldPanel.replaceWith(this._buildPlaylistPanel(this._playlist)); }
        }
    }
};


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

})();
