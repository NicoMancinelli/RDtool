// ==UserScript==
// @name         Real-Debrid Suite
// @namespace    http://tampermonkey.net/
// @version      41.2
// @updateURL    https://github.com/NicoMancinelli/RDtool/raw/main/dist/real-debrid-suite.user.js
// @downloadURL  https://github.com/NicoMancinelli/RDtool/raw/main/dist/real-debrid-suite.user.js
// @description  The ultimate RD tool. Liquid Glass UI, Cloud Management, Smart Magnets, PiP Media Player, Mobile Support.
// @author       Neek
// @license      MIT
// @homepageURL  https://github.com/NicoMancinelli/RDtool
// @supportURL   https://github.com/NicoMancinelli/RDtool/issues
// @match        *://*/*
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      real-debrid.com
// @sandbox      raw
// @run-at       document-end
// ==/UserScript==

(function() {
'use strict';

// --- Step 1: CSS via GM_addStyle ---
GM_addStyle(`:root {
            --rd-bg-base: #0a0a0a;
            /* Near-opaque dark underlay so glass stays readable on light pages */
            --rd-bg-surface: rgba(14, 14, 16, 0.92);
            --rd-bg-glass: rgba(255, 255, 255, 0.1);
            --rd-bg-glass-hover: rgba(255, 255, 255, 0.15);
            --rd-bg-glass-active: rgba(255, 255, 255, 0.08);
            --rd-glass-tint: rgba(120, 160, 255, 0.06);
            --rd-glass-blur: blur(40px) saturate(180%);
            --rd-glass-border: rgba(255, 255, 255, 0.18);
            --rd-glass-highlight: inset 0 0.5px 0 rgba(255, 255, 255, 0.18);
            --rd-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
            --rd-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.35);
            --rd-text-primary: #f5f5f7;
            --rd-text-secondary: rgba(255, 255, 255, 0.68);
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
            color: var(--rd-text-primary);
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
            background: linear-gradient(135deg, var(--rd-glass-tint), var(--rd-bg-glass)), var(--rd-bg-surface);
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
            background: linear-gradient(135deg, var(--rd-glass-tint), var(--rd-bg-glass)), var(--rd-bg-surface);
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
            background: linear-gradient(135deg, var(--rd-glass-tint), var(--rd-bg-glass)), var(--rd-bg-surface);
            backdrop-filter: var(--rd-glass-blur);
            -webkit-backdrop-filter: var(--rd-glass-blur);
            border-radius: var(--rd-radius-lg);
            display: flex;
            flex-direction: column;
            border: 1px solid var(--rd-glass-border);
            box-shadow: var(--rd-glass-highlight), var(--rd-shadow);
            color: var(--rd-text-primary);
        }
        .rd-mobile-sheet {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            max-height: 85vh;
            background: linear-gradient(180deg, var(--rd-bg-glass), transparent), var(--rd-bg-surface);
            backdrop-filter: var(--rd-glass-blur);
            -webkit-backdrop-filter: var(--rd-glass-blur);
            border-radius: var(--rd-radius-lg) var(--rd-radius-lg) 0 0;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--rd-glass-border);
            box-shadow: var(--rd-glass-highlight), var(--rd-shadow);
            transition: transform 0.3s ease;
            color: var(--rd-text-primary);
        }

        /* Header */
        .rd-header {
            flex-shrink: 0;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.08);
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
            background: rgba(0, 0, 0, 0.25);
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
            background: rgba(0, 0, 0, 0.28);
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
            background: rgba(0, 0, 0, 0.35);
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
        .rd-textarea::placeholder {
            color: var(--rd-text-secondary);
            opacity: 1;
        }
        .rd-textarea:focus {
            border-color: var(--rd-accent);
            box-shadow: 0 0 0 3px rgba(110, 177, 255, 0.15);
        }
        .rd-search-bar {
            width: 100%;
            height: auto;
            background: rgba(0, 0, 0, 0.35);
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
        .rd-search-bar::placeholder {
            color: var(--rd-text-secondary);
            opacity: 1;
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
            background: linear-gradient(180deg, var(--rd-bg-glass), transparent), rgba(0, 0, 0, 0.35);
            border-radius: var(--rd-radius-sm);
            padding: 10px;
            border: 1px solid var(--rd-glass-border);
            border-left: 2px solid transparent;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: var(--rd-shadow-sm);
            transition: background 0.2s ease;
            color: var(--rd-text-primary);
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
            background: rgba(255, 255, 255, 0.14);
            color: var(--rd-text-primary);
            border: 1px solid var(--rd-glass-border);
            padding: 4px 10px;
            border-radius: var(--rd-radius-xs);
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
            white-space: nowrap;
        }
        .rd-action-btn:hover {
            background: rgba(255, 255, 255, 0.22);
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
        .rd-queue-badge {
            background: var(--rd-warning);
            top: auto;
            bottom: -4px;
            left: -4px;
            right: auto;
            width: auto;
            min-width: 18px;
            padding: 0 4px;
            border-radius: 9px;
        }
        .rd-queue-status {
            font-size: 10px;
            color: var(--rd-warning);
            font-weight: 600;
            white-space: nowrap;
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
            background: rgba(0, 0, 0, 0.4);
            height: 5px;
            border-radius: 3px;
            margin-top: 4px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.12);
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
            background: linear-gradient(135deg, var(--rd-glass-tint), var(--rd-bg-glass)), var(--rd-bg-surface);
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
            background: linear-gradient(135deg, var(--rd-glass-tint), var(--rd-bg-glass)), var(--rd-bg-surface);
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
  VERSION: "41.2",
  SETTINGS_VERSION: 2,

  // Tab identifiers — single source of truth to avoid typo bugs in Tabs.* lookups.
  TAB_KEYS: Object.freeze({
    CLOUD: "cloud",
    LINKS: "links",
    PAGE: "page",
    SETTINGS: "settings",
    TORRENTS: "torrents",
  }),

  BASE_HOSTS: [
    "1fichier\\.com\\/\\?[a-z0-9]{10,10}",
    "rapidgator\\.net\\/file\\/[a-z0-9]{32,32}",
    "mega\\.nz\\/(file|folder|#F?!)",
    "mediafire\\.com\\/(file|folder)\\/[a-z0-9]{15,15}",
    "drive\\.google\\.com\\/(file|drive|folders)\\/.+",
    "youtube\\.com\\/watch\\?v\\=[a-zA-Z0-9]{11,11}",
    "turbobit\\.net\\/[a-z0-9]{12,12}",
    "uploaded\\.net\\/file\\/[a-z0-9]{8,8}",
    "zippyshare\\.com\\/v\\/[a-zA-Z0-9]{8,8}\\/file",
    "k2s\\.cc\\/file\\/",
    "keep2share\\.cc\\/file\\/",
    "nitroflare\\.com\\/view\\/[A-Z0-9]{15,15}",
    "pixeldrain\\.com\\/u\\/[a-zA-Z0-9]+",
    "ddownload\\.com\\/[a-zA-Z0-9]+",
    "katfile\\.com\\/[a-zA-Z0-9]+",
    "gofile\\.io\\/d\\/[a-zA-Z0-9]+",
    "qiwi\\.gg\\/file\\/[a-zA-Z0-9\\-]+",
  ],

  defaultSettings: {
    hijack: false,
    autoShow: true,
    magnetAction: "smart",
    filterExts: "nfo, txt, url, jpg, png, md, srt",
    smartFilter: false,
    autoCleanup: false,
    defaultAction: "dl",
    extPlayer: "browser",
    customHosts: "",
    exportFormat: "raw",
    notificationSound: false,
    notifyOnQueueComplete: true,
    deepScan: false,
    dedupeHistory: true,
    toggleShortcut: "alt+r",
    rememberLastTab: true,
    rememberDashboardOpen: false,
    switchToTorrentsOnMagnet: false,
    openDashboardOnMagnet: false,
    torrentPollInterval: "4",
    queueConcurrency: "3",
    cloudLimit: "100",
    useUnrestrictCache: true,
    apiRateLimit: "4",
    maxLinksPerScan: "150",
    useApiHostRegex: true,
  },

  isMobile:
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2),

  getKey() {
    const gmKey = GM_getValue("rd_api_key", "");
    if (gmKey) return gmKey;
    const lsKey = localStorage.getItem("rd_api_key_backup");
    return lsKey || "";
  },

  saveKey(key) {
    if (!key || key.trim().length < 5) return;
    GM_setValue("rd_api_key", key.trim());
    localStorage.setItem("rd_api_key_backup", key.trim());
    State.apiKey = key.trim();
  },

  clearKey() {
    GM_setValue("rd_api_key", "");
    localStorage.removeItem("rd_api_key_backup");
    State.apiKey = "";
  },

  getActiveRegex() {
    if (State.settings.useApiHostRegex && State.apiHostRegex) {
      try {
        return new RegExp(State.apiHostRegex, "i");
      } catch (e) {
        /* fall through */
      }
    }

    const allHosts = [...this.BASE_HOSTS];

    if (State.dynamicHosts && State.dynamicHosts.length) {
      State.dynamicHosts.forEach((h) => {
        allHosts.push(h.replace(/\./g, "\\."));
      });
    }

    if (State.settings && State.settings.customHosts) {
      State.settings.customHosts
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean)
        .forEach((h) => {
          allHosts.push(h.replace(/\./g, "\\."));
        });
    }

    return new RegExp("\\b(" + allHosts.join("|") + ")", "i");
  },

  hostRegex: null,

  parseShortcut(str) {
    const parts = (str || "")
      .toLowerCase()
      .split("+")
      .map((s) => s.trim())
      .filter(Boolean);
    const modifiers = { alt: false, ctrl: false, shift: false, meta: false };
    let key = "";
    for (const part of parts) {
      if (part === "alt") modifiers.alt = true;
      else if (part === "ctrl" || part === "control") modifiers.ctrl = true;
      else if (part === "shift") modifiers.shift = true;
      else if (part === "meta" || part === "cmd" || part === "command")
        modifiers.meta = true;
      else key = part;
    }
    return { modifiers, key };
  },

  matchesShortcut(e, shortcutStr) {
    const { modifiers, key } = this.parseShortcut(shortcutStr);
    if (!key) return false;
    if (e.altKey !== modifiers.alt) return false;
    if (e.ctrlKey !== modifiers.ctrl) return false;
    if (e.shiftKey !== modifiers.shift) return false;
    if (e.metaKey !== modifiers.meta) return false;
    return e.key.toLowerCase() === key;
  },
};

// =========================================================================


// State Module
    // =========================================================================

    const State = {
        apiKey: '',
        settings: {},
        currentTab: Config.TAB_KEYS.LINKS,
        isExpanded: false,
        isMobile: false,
        // Data
        linkHistory: [],
        cachedTorrents: [],
        cachedCloud: [],
        scannedLinksMap: new Map(),
        dynamicHosts: [],
        hostsUpdatedAt: null,
        hostsFetchFailed: false,
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
        // Queue
        queueProcessing: false,
        queueCancel: false,
        queueCompleted: 0,
        queueTotal: 0,
        // Session
        sessionStats: { processed: 0 },
        linksHistoryFilter: '',
        linksHistoryTypeFilter: 'all',
        lastUrl: location.href,
        unrestrictCache: new Map(),
        linkCheckCache: new Map(),
        pageCollapsedDomains: new Set(),
        torrentStatusFilter: 'all',
        pageLinkCache: new Map(),
        cloudPage: 1,
        cloudHasMore: false,
        activeTorrentCount: null,
        apiHostRegex: null,
        apiHostRegexFolder: null,
        trafficDetails: null
    };

    // =========================================================================
    // State Initialization
    // =========================================================================

    State.apiKey = Config.getKey();
    State.isMobile = Config.isMobile;

    // Validate and load settings
    const savedSettings = JSON.parse(GM_getValue('rd_settings', '{}'));
    State.settings = migrateSettings(savedSettings);

    if (State.settings.rememberLastTab) {
        const lastTab = GM_getValue('rd_last_tab', Config.TAB_KEYS.LINKS);
        if (Object.values(Config.TAB_KEYS).includes(lastTab)) {
            State.currentTab = lastTab;
        }
    }

    // Load and validate history (cap at 500)
    try {
        const hist = JSON.parse(GM_getValue('rd_link_history', '[]'));
        State.linkHistory = Array.isArray(hist) ? hist.filter(h => h && h.type).slice(-500) : [];
    } catch(e) { State.linkHistory = []; }

    // Load dynamic hosts
    try { State.dynamicHosts = JSON.parse(GM_getValue('rd_dynamic_hosts', '[]')); } catch(e) { State.dynamicHosts = []; }
    const savedHostsAt = parseInt(GM_getValue('rd_hosts_updated_at', '0'), 10);
    if (savedHostsAt > 0) State.hostsUpdatedAt = savedHostsAt;

    // Now build the host regex
    Config.hostRegex = Config.getActiveRegex();

    // =========================================================================


// Utility Functions
    // =========================================================================

    function saveSettings() {
        State.settings._settingsVersion = Config.SETTINGS_VERSION;
        GM_setValue('rd_settings', JSON.stringify(State.settings));
    }

    function migrateSettings(raw) {
        const settings = {};
        for (const key of Object.keys(Config.defaultSettings)) {
            settings[key] = raw && Object.prototype.hasOwnProperty.call(raw, key) ? raw[key] : Config.defaultSettings[key];
        }
        return settings;
    }

    function isBrowserNativeMedia(filename, url) {
        const name = filename || url || '';
        return /\.(mp4|webm|mov|mp3|flac|wav|ogg|jpg|jpeg|png|webp|gif)(\?|$)/i.test(name);
    }

    function extractRdLinkId(url, downloadId) {
        if (downloadId) return String(downloadId);
        if (!url) return null;
        const m = url.match(/real-debrid\.com\/d\/([A-Z0-9]+)/i) || url.match(/\/d\/([A-Z0-9]+)/i);
        return m ? m[1] : null;
    }

    async function resolvePlayableUrl(url, filename, downloadId) {
        if (State.settings.extPlayer !== 'browser') {
            return { url: getStreamUrl(url), mode: 'external' };
        }
        if (isBrowserNativeMedia(filename, url)) {
            return { url, mode: 'direct' };
        }
        const id = extractRdLinkId(url, downloadId);
        if (!id) return { url, mode: 'direct' };
        const res = await API.getStreamingTranscode(id);
        if (res.ok && res.data && typeof res.data === 'object') {
            const streamUrl = res.data.mp4 || res.data.apple || res.data.dash ||
                Object.values(res.data).find((v) => typeof v === 'string' && v.startsWith('http'));
            if (streamUrl) return { url: streamUrl, mode: 'transcode' };
        }
        if (State.settings.extPlayer !== 'browser') {
            return { url: getStreamUrl(url), mode: 'external' };
        }
        return { url, mode: 'direct' };
    }

    async function playMediaUrl(url, filename, downloadId, playlist) {
        const resolved = await resolvePlayableUrl(url, filename, downloadId);
        if (resolved.mode === 'external') {
            window.open(resolved.url, '_self');
            return;
        }
        if (typeof Media !== 'undefined') {
            Media.open(resolved.url, filename, playlist, resolved.mode);
        }
    }

    function formatRelativeTime(ts) {
        if (!ts) return '';
        const sec = Math.floor((Date.now() - ts) / 1000);
        if (sec < 60) return 'just now';
        const min = Math.floor(sec / 60);
        if (min < 60) return min + 'm ago';
        const hr = Math.floor(min / 60);
        if (hr < 24) return hr + 'h ago';
        const day = Math.floor(hr / 24);
        if (day < 7) return day + 'd ago';
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

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
        get _maxPerSec() {
            return Math.max(1, parseInt(State.settings.apiRateLimit, 10) || 4);
        },
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

                if ((method === 'POST' || method === 'PUT') && data) {
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

        put(endpoint, data) {
            return this.request('PUT', endpoint, data);
        },

        _torrentHostCache: null,

        async resolveTorrentHost() {
            if (this._torrentHostCache) return this._torrentHostCache;
            const res = await this.getTorrentsAvailableHosts();
            if (res.ok && res.data) {
                const hosts = Object.keys(res.data);
                this._torrentHostCache = hosts[0] || '';
            } else {
                this._torrentHostCache = '';
            }
            return this._torrentHostCache;
        },

        getStreamingTranscode(id) {
            return this.get('/streaming/transcode/' + id);
        },

        getStreamingMediaInfos(id) {
            return this.get('/streaming/mediaInfos/' + id);
        },

        getHostsRegex() {
            return this.get('/hosts/regex');
        },

        getHostsRegexFolder() {
            return this.get('/hosts/regexFolder');
        },

        getTorrentsActiveCount() {
            return this.get('/torrents/activeCount');
        },

        getTorrentsAvailableHosts() {
            return this.get('/torrents/availableHosts');
        },

        deleteAllDownloads() {
            return this.del('/downloads/deleteAll');
        },

        deleteAllTorrents() {
            return this.del('/torrents/deleteAll');
        },

        getDownloadsPage(limit, page) {
            const l = limit || 100;
            const p = page || 1;
            return this.get('/downloads?limit=' + l + '&page=' + p);
        },

        renameDownload(id, newFilename) {
            return this.put('/downloads/rename/' + id, { newFilename: newFilename });
        },

        getTrafficDetails() {
            return this.get('/traffic/details');
        },

        upload(endpoint, file, _retried) {
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

                            if (status === 429 && !_retried) {
                                const retryAfter = parseInt(resp.responseHeaders?.match(/retry-after:\s*(\d+)/i)?.[1]) || 5;
                                return setTimeout(() => {
                                    this.upload(endpoint, file, true).then(resolve);
                                }, retryAfter * 1000);
                            }

                            if (status === 503 && !_retried) {
                                return setTimeout(() => {
                                    this.upload(endpoint, file, true).then(resolve);
                                }, 2000);
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


// List Renderer — incremental DOM patching for list tabs
    // =========================================================================

    const ListRenderer = {
        patch(container, items, options) {
            if (!container) return;
            const keyFn = options.key || ((item) => item.id);
            const renderFn = options.render;
            const compareFn = options.compare || ListRenderer._shallowEqual;
            const emptyMessage = options.emptyMessage || 'No items.';

            if (!items.length) {
                container.innerHTML = '';
                container.append(DOM.create('div', {
                    style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);',
                    textContent: emptyMessage
                }));
                return;
            }

            const emptyEl = container.querySelector('[data-list-empty]');
            if (emptyEl) emptyEl.remove();

            const existing = new Map();
            container.querySelectorAll('[data-list-key]').forEach((el) => {
                existing.set(el.dataset.listKey, el);
            });

            const newKeySet = new Set(items.map((item) => String(keyFn(item))));
            for (const [k, el] of existing) {
                if (!newKeySet.has(k)) el.remove();
            }

            let prev = null;
            for (const item of items) {
                const k = String(keyFn(item));
                // O(1) lookup via the existing Map — avoids O(n) querySelector per item
                let el = existing.get(k);
                const prevData = el && el._listData;

                if (!el) {
                    el = renderFn(item);
                    el.dataset.listKey = k;
                    el._listData = item;
                    if (prev) {
                        if (prev.nextSibling !== el) container.insertBefore(el, prev.nextSibling);
                    } else {
                        container.insertBefore(el, container.firstChild);
                    }
                } else if (!prevData || !compareFn(item, prevData)) {
                    const oldChk = el.querySelector('input[type="checkbox"]');
                    const wasChecked = oldChk ? oldChk.checked : false;
                    const newEl = renderFn(item);
                    newEl.dataset.listKey = k;
                    newEl._listData = item;
                    const newChk = newEl.querySelector('input[type="checkbox"]');
                    if (newChk && wasChecked) newChk.checked = true;
                    el.replaceWith(newEl);
                    el = newEl;
                }

                if (prev && el.previousElementSibling !== prev) {
                    container.insertBefore(el, prev.nextSibling);
                }
                prev = el;
            }
        },

        torrentCompare(a, b) {
            return a.id === b.id && a.status === b.status && a.progress === b.progress &&
                a.speed === b.speed && a.bytes === b.bytes && a.filename === b.filename &&
                JSON.stringify(a.links) === JSON.stringify(b.links);
        },

        cloudCompare(a, b) {
            return a.id === b.id && a.filename === b.filename && a.filesize === b.filesize &&
                a.download === b.download && a.generated === b.generated;
        },

        // Cheap structural equality for top-level scalar fields.
        // Caller-provided compare functions still recommended for nested arrays/objects.
        _shallowEqual(a, b) {
            if (a === b) return true;
            if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
            const ak = Object.keys(a), bk = Object.keys(b);
            if (ak.length !== bk.length) return false;
            for (const k of ak) if (a[k] !== b[k]) return false;
            return true;
        }
    };


// --- Step 2: UI Module ---
    const LIGHTNING_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';

    function isTypingInField(target) {
        if (!target || !target.tagName) return false;
        const tag = target.tagName.toUpperCase();
        return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    }

    function formatShortcut(str) {
        return (str || '').split('+').map((part) => {
            const p = part.trim().toLowerCase();
            if (p === 'alt') return 'Alt';
            if (p === 'ctrl' || p === 'control') return 'Ctrl';
            if (p === 'shift') return 'Shift';
            if (p === 'meta' || p === 'cmd' || p === 'command') return 'Cmd';
            return p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1);
        }).join('+');
    }

    const UI = {
        // Listeners installed by init() and torn down by destroy(). Page-lifetime
        // for now (userscript runs in document context until navigation reload),
        // but we keep refs so future hot-reload or SPA-unmount paths can release
        // them without re-grepping the file.
        _globalKeydownHandler: null,
        _visibilityChangeHandler: null,
        _containerListeners: [],

        destroy() {
            // Releases every listener installed by init(). Currently unused at
            // runtime (Tampermonkey page lifecycle owns disposal), but exposed so
            // future HMR / SPA route-switch paths can call it without leaving
            // orphaned listeners — see HER-117.
            if (this._globalKeydownHandler) {
                document.removeEventListener('keydown', this._globalKeydownHandler);
                this._globalKeydownHandler = null;
            }
            if (this._visibilityChangeHandler) {
                document.removeEventListener('visibilitychange', this._visibilityChangeHandler);
                this._visibilityChangeHandler = null;
            }
            this._containerListeners.forEach(({ target, type, handler, options }) => {
                target.removeEventListener(type, handler, options);
            });
            this._containerListeners = [];
        },

        // Registers a listener on a DOM target and remembers the (target, type,
        // handler, options) tuple so destroy() can remove it later. Use this for
        // any listener installed by init() that isn't on document.
        _trackContainerListener(target, type, handler, options) {
            target.addEventListener(type, handler, options);
            this._containerListeners.push({ target, type, handler, options });
        },

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
                if (State.settings.rememberDashboardOpen && GM_getValue('rd_dashboard_open', false)) {
                    UI.toggleDashboard(true);
                }
            }

            // --- Step 3: Event delegation ---
            // HER-117: every listener installed here is registered through the
            // _trackContainerListener / named-handler helpers so UI.destroy()
            // can release them without re-grepping the source.

            const onContainerClick = (e) => {
                // If FAB is showing (not expanded) and has API key, open dashboard
                if (!State.isExpanded && State.apiKey) {
                    const fab = container.querySelector('.rd-desktop-fab, .rd-mobile-fab');
                    if (fab && (fab === e.target || fab.contains(e.target))) {
                        UI.toggleDashboard(true);
                        return;
                    }
                }
            };
            UI._trackContainerListener(container, 'click', onContainerClick);

            // Global keydown — page-lifetime listener. Ref is kept on UI so
            // destroy() can remove it if a future hot-reload or SPA-unmount
            // path ever needs to. Single registration: UI.init() is called once
            // per script load.
            UI._globalKeydownHandler = (e) => {
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
                if (Config.matchesShortcut(e, State.settings.toggleShortcut)) {
                    e.preventDefault();
                    UI.toggleDashboard(!State.isExpanded);
                }
                if (State.isExpanded && e.key === '?' && !isTypingInField(e.target)) {
                    e.preventDefault();
                    UI.showShortcutsModal();
                }
            };
            document.addEventListener('keydown', UI._globalKeydownHandler);

            // Visibility change — pause/resume torrent polling
            UI._visibilityChangeHandler = () => {
                if (document.hidden) {
                    if (State.torrentRefreshInterval) {
                        clearInterval(State.torrentRefreshInterval);
                        State.torrentRefreshInterval = null;
                    }
                } else {
                    if (State.isExpanded && State.currentTab === Config.TAB_KEYS.TORRENTS && Tabs.Torrents && Tabs.Torrents.startPolling) {
                        Tabs.Torrents.startPolling();
                    }
                }
            };
            document.addEventListener('visibilitychange', UI._visibilityChangeHandler);

            // Drag and drop on container
            const onDragOver = (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.add('rd-drag-active');
            };
            const onDragLeave = (e) => {
                e.preventDefault();
                container.classList.remove('rd-drag-active');
            };
            const onDrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.remove('rd-drag-active');

                // Check for .torrent files
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                    for (const file of e.dataTransfer.files) {
                        if (file.name.endsWith('.torrent')) {
                            uploadTorrentFile(file);
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
            };
            UI._trackContainerListener(container, 'dragover', onDragOver);
            UI._trackContainerListener(container, 'dragleave', onDragLeave);
            UI._trackContainerListener(container, 'drop', onDrop);
        },

        renderFAB() {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;
            DOM.clear(container);

            const fabClass = State.isMobile ? 'rd-mobile-fab' : 'rd-desktop-fab';
            const badge = DOM.create('span', { className: 'rd-badge', id: 'rd-fab-badge', textContent: '0' });
            const queueBadge = DOM.create('span', {
                className: 'rd-badge rd-queue-badge',
                id: 'rd-fab-queue-badge',
                textContent: ''
            });
            const fabAttrs = { className: fabClass, style: 'position:relative;' };
            if (!State.isMobile) {
                fabAttrs.title = 'RD Suite (' + formatShortcut(State.settings.toggleShortcut) + ')';
            }
            const fab = DOM.create('div', fabAttrs, [
                DOM.create('span', { htmlContent: LIGHTNING_SVG }),
                badge,
                queueBadge
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
            if (State.queueProcessing) UI.updateQueueProgress(State.queueCompleted, State.queueTotal);
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
                    onClick: async () => {
                        const key = input.value.trim();
                        if (key.length < 5) {
                            UI.showToast('Key too short', 'error');
                            return;
                        }
                        const prevKey = State.apiKey;
                        Config.saveKey(key);
                        const userRes = await API.get('/user');
                        if (!userRes.ok) {
                            Config.clearKey();
                            if (prevKey) Config.saveKey(prevKey);
                            UI.showToast('Invalid API key — check and try again', 'error');
                            return;
                        }
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

        switchTab(key) {
            const valid = Object.values(Config.TAB_KEYS);
            if (!valid.includes(key)) return;

            if (State.currentTab === Config.TAB_KEYS.TORRENTS && key !== Config.TAB_KEYS.TORRENTS && Tabs.Torrents && Tabs.Torrents.stopPolling) {
                Tabs.Torrents.stopPolling();
            }

            State.currentTab = key;
            if (State.settings.rememberLastTab) GM_setValue('rd_last_tab', key);

            const tabsEl = document.querySelector('.rd-tabs');
            if (tabsEl) {
                tabsEl.querySelectorAll('.rd-tab').forEach(tb => {
                    tb.classList.toggle('active', tb.dataset.tab === key);
                });
            }

            if (key === Config.TAB_KEYS.TORRENTS && Tabs.Torrents && Tabs.Torrents.startPolling) {
                Tabs.Torrents.startPolling();
            }

            const capKey = key.charAt(0).toUpperCase() + key.slice(1);
            if (Tabs[capKey] && Tabs[capKey].render) {
                Tabs[capKey].render();
            }
        },

        openTab(key, after) {
            if (!State.isExpanded) {
                State.currentTab = key;
                this.toggleDashboard(true);
            } else if (State.currentTab !== key) {
                this.switchTab(key);
            }
            if (after) after();
        },

        toggleDashboard(show) {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;

            if (show) {
                State.isExpanded = true;
                if (State.settings.rememberDashboardOpen) GM_setValue('rd_dashboard_open', true);
                if (State.settings.rememberLastTab) {
                    const lastTab = GM_getValue('rd_last_tab', Config.TAB_KEYS.LINKS);
                    if (Object.values(Config.TAB_KEYS).includes(lastTab)) {
                        State.currentTab = lastTab;
                    }
                }
                // Reset container inline style in case setup changed it
                container.style.cssText = '';
                container.classList.remove('rd-hidden');
                const dashClass = State.isMobile ? 'rd-mobile-sheet' : 'rd-desktop-dash';
                container.className = dashClass;
                UI.renderDashboard();
                addMobileSheetBehavior(container);

                // Start torrent polling if on torrents tab
                if (State.currentTab === Config.TAB_KEYS.TORRENTS && Tabs.Torrents && Tabs.Torrents.startPolling) {
                    Tabs.Torrents.startPolling();
                }
            } else {
                State.isExpanded = false;
                if (State.settings.rememberDashboardOpen) GM_setValue('rd_dashboard_open', false);
                container.className = '';
                container.style.cssText = '';

                // Stop torrent polling
                if (Tabs.Torrents && Tabs.Torrents.stopPolling) {
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
                        textContent: 'v' + Config.VERSION,
                        style: 'background:var(--rd-bg-glass);padding:2px 8px;border-radius:10px;font-size:9px;color:var(--rd-text-secondary);border:1px solid var(--rd-glass-border);'
                    }),
                    DOM.create('span', {
                        textContent: State.sessionStats.processed + ' processed',
                        style: 'font-size:10px;color:var(--rd-text-secondary);margin-left:4px;',
                        id: 'rd-session-counter'
                    }),
                    DOM.create('span', {
                        id: 'rd-header-quota',
                        style: 'font-size:9px;color:var(--rd-accent);background:var(--rd-bg-glass);padding:2px 8px;border-radius:10px;border:1px solid var(--rd-glass-border);',
                        textContent: ''
                    }),
                    DOM.create('span', {
                        id: 'rd-queue-progress',
                        className: 'rd-queue-status',
                        style: State.queueProcessing ? '' : 'display:none;',
                        textContent: State.queueProcessing ? 'Processing ' + State.queueCompleted + '/' + State.queueTotal + '...' : ''
                    }),
                    DOM.create('button', {
                        id: 'rd-queue-cancel',
                        className: 'rd-input-btn',
                        textContent: 'Cancel',
                        style: State.queueProcessing ? 'margin:0;padding:2px 8px;font-size:10px;' : 'display:none;',
                        onClick: () => {
                            State.queueCancel = true;
                            UI.showToast('Cancelling queue...');
                        }
                    })
                ]),
                DOM.create('div', { style: 'display:flex;align-items:center;gap:4px;' }, [
                    DOM.create('button', {
                        className: 'rd-input-btn',
                        textContent: '?',
                        title: 'Keyboard shortcuts',
                        style: 'margin:0;padding:2px 8px;font-size:12px;min-width:28px;',
                        onClick: () => UI.showShortcutsModal()
                    }),
                    DOM.create('span', {
                        textContent: '\u2715',
                        style: 'cursor:pointer;color:var(--rd-text-secondary);font-size:16px;padding:4px 8px;',
                        className: 'rd-close-btn',
                        onClick: () => UI.toggleDashboard(false)
                    })
                ])
            ]);

            // Tabs
            const tabDefs = [
                { key: Config.TAB_KEYS.LINKS, label: 'Links' },
                { key: Config.TAB_KEYS.PAGE, label: 'Page', badge: true },
                { key: Config.TAB_KEYS.TORRENTS, label: 'Torrents' },
                { key: Config.TAB_KEYS.CLOUD, label: 'Cloud' },
                { key: Config.TAB_KEYS.SETTINGS, label: 'Settings' }
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
                    onClick: () => UI.switchTab(t.key)
                }, tabChildren);
                tabs.appendChild(tab);
            });

            // Content area
            const contentArea = DOM.create('div', { className: 'rd-content', id: 'rd-content-area' });

            container.appendChild(header);
            container.appendChild(tabs);
            container.appendChild(contentArea);

            UI.fetchAccountSummary();
            UI.updateHeaderQuota();

            const capKey = State.currentTab.charAt(0).toUpperCase() + State.currentTab.slice(1);
            if (Tabs[capKey] && Tabs[capKey].render) {
                Tabs[capKey].render();
            } else {
                contentArea.appendChild(DOM.create('div', {
                    style: 'padding:40px;text-align:center;color:var(--rd-text-secondary);font-size:12px;',
                    textContent: 'Tab "' + capKey + '" not loaded yet.'
                }));
            }
        },

        async fetchAccountSummary() {
            if (!State.apiKey) return;
            const userRes = await API.get('/user');
            if (userRes.ok) State.userProfile = userRes.data;
            const trafficRes = await API.get('/traffic');
            if (trafficRes.ok) State.trafficData = trafficRes.data;
            const countRes = await API.getTorrentsActiveCount();
            if (countRes.ok && typeof countRes.data === 'number') State.activeTorrentCount = countRes.data;
            UI.updateHeaderQuota();
        },

        updateHeaderQuota() {
            const el = document.getElementById('rd-header-quota');
            if (!el) return;
            const parts = [];
            if (State.userProfile && State.userProfile.expiration) {
                const daysLeft = Math.max(0, Math.ceil((new Date(State.userProfile.expiration) - new Date()) / 86400000));
                parts.push(daysLeft + 'd left');
            }
            if (State.trafficData) {
                const quotas = Object.entries(State.trafficData).filter(([, d]) => d.limit && d.limit > 0);
                if (quotas.length) {
                    const [, d] = quotas[0];
                    const pct = Math.round(((d.limit - d.left) / d.limit) * 100);
                    parts.push('Quota ' + pct + '%');
                    if (pct >= 90) UI.showToast('Daily quota almost exhausted', 'error');
                }
            }
            if (typeof State.activeTorrentCount === 'number') {
                parts.push(State.activeTorrentCount + ' active');
            }
            el.textContent = parts.join(' · ');
            el.style.display = parts.length ? '' : 'none';
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

        // System notification + optional chime. Wraps GM_notification so callers don't repeat the pattern.
        notify(title, text, timeout = 4000) {
            try { GM_notification({ title, text, timeout }); } catch (_) { /* GM_notification may be disabled */ }
            if (State.settings.notificationSound && typeof playNotificationChime === 'function') playNotificationChime();
        },

        showShortcutsModal() {
            if (document.querySelector('.rd-modal-overlay')) return;

            const shortcutRow = (keys, desc) => DOM.create('div', {
                style: 'display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid var(--rd-glass-border);font-size:12px;'
            }, [
                DOM.create('span', { textContent: keys, style: 'color:var(--rd-text-primary);font-family:monospace;white-space:nowrap;' }),
                DOM.create('span', { textContent: desc, style: 'color:var(--rd-text-secondary);text-align:right;' })
            ]);

            const section = (title, rows) => {
                const wrap = DOM.create('div', { style: 'margin-bottom:12px;' });
                wrap.appendChild(DOM.create('div', {
                    textContent: title,
                    style: 'font-size:11px;font-weight:bold;color:var(--rd-text-secondary);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;'
                }));
                rows.forEach((row) => wrap.appendChild(row));
                return wrap;
            };

            const content = DOM.create('div', { style: 'display:flex;flex-direction:column;' }, [
                section('General', [
                    shortcutRow(formatShortcut(State.settings.toggleShortcut), 'Toggle dashboard'),
                    shortcutRow('Esc', 'Close (modal \u2192 fullscreen \u2192 media \u2192 dashboard)'),
                    shortcutRow('?', 'Show this help')
                ]),
                section('Links', [
                    shortcutRow('Ctrl+Enter / Cmd+Enter', 'Unrestrict')
                ]),
                section('Media player', [
                    shortcutRow('Space', 'Play / pause'),
                    shortcutRow('\u2190 / \u2192', 'Seek \u00b110s'),
                    shortcutRow('\u2191 / \u2193', 'Volume \u00b110%'),
                    shortcutRow('F', 'Toggle fullscreen'),
                    shortcutRow('P', 'Picture-in-picture'),
                    shortcutRow('M', 'Mute'),
                    shortcutRow('Esc', 'Exit fullscreen or close player')
                ])
            ]);

            let modalRef;
            const closeBtn = DOM.create('button', {
                className: 'rd-input-btn',
                textContent: 'Close',
                style: 'margin:0;',
                onClick: () => modalRef && modalRef.close()
            });
            modalRef = UI.showModal('Keyboard Shortcuts', [content], [closeBtn]);
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

        setQueueActive(active) {
            const progEl = document.getElementById('rd-queue-progress');
            const cancelBtn = document.getElementById('rd-queue-cancel');
            const queueBadge = document.getElementById('rd-fab-queue-badge');
            if (progEl) progEl.style.display = active ? '' : 'none';
            if (cancelBtn) cancelBtn.style.display = active ? '' : 'none';
            if (queueBadge) queueBadge.classList.toggle('visible', active);
            if (!active && queueBadge) queueBadge.textContent = '';
        },

        updateQueueProgress(completed, total) {
            const label = 'Processing ' + completed + '/' + total + '...';
            const progEl = document.getElementById('rd-queue-progress');
            if (progEl) {
                progEl.textContent = label;
                progEl.style.display = '';
            }
            const cancelBtn = document.getElementById('rd-queue-cancel');
            if (cancelBtn) cancelBtn.style.display = '';
            const queueBadge = document.getElementById('rd-fab-queue-badge');
            if (queueBadge) {
                queueBadge.textContent = completed + '/' + total;
                queueBadge.classList.add('visible');
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
        if (State.settings.dedupeHistory && item.type === 'success') {
            const urlKey = item.download || item.url;
            if (urlKey && urlKey !== '#') {
                State.linkHistory = State.linkHistory.filter(h => {
                    if (h.type !== 'success') return true;
                    const existing = h.download || h.url;
                    return !existing || existing === '#' || existing !== urlKey;
                });
            }
        }
        State.linkHistory.push(item);
        if (State.linkHistory.length > 500) State.linkHistory = State.linkHistory.slice(-500);
        GM_setValue('rd_link_history', JSON.stringify(State.linkHistory));
        if (item.type === 'success') State.sessionStats.processed++;
        // Update header stats counter if visible
        const statsEl = document.getElementById('rd-session-counter');
        if (statsEl) statsEl.textContent = State.sessionStats.processed + ' processed';
        if (State.currentTab === Config.TAB_KEYS.LINKS && Tabs.Links) Tabs.Links.refresh();
    }

    async function unrestrictLink(url, silent = false) {
        if (State.settings.useUnrestrictCache && State.unrestrictCache.has(url)) {
            const cached = State.unrestrictCache.get(url);
            addToHistory({
                type: 'success', name: cached.name,
                url: cached.url, download: cached.url,
                size: cached.size
            });
            if (!silent) applyDefaultAction(cached.url);
            return cached.url;
        }

        const { ok, data, error } = await API.post('/unrestrict/link', { link: url });
        if (!ok) {
            addToHistory({ type: 'error', msg: 'Unrestrict failed: ' + error, sourceUrl: url });
            return null;
        }
        const dlUrl = data.download;
        const entry = {
            name: data.filename,
            url: dlUrl,
            size: formatBytes(data.filesize)
        };
        if (State.settings.useUnrestrictCache) State.unrestrictCache.set(url, entry);
        addToHistory({
            type: 'success', name: entry.name,
            url: dlUrl, download: dlUrl,
            size: entry.size
        });
        if (!silent) applyDefaultAction(dlUrl);
        return dlUrl;
    }

    function applyDefaultAction(url) {
        if (State.settings.defaultAction === 'dl') window.open(url, '_blank');
        else if (State.settings.defaultAction === 'copy') UI.copyToClipboard(url);
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
            if (!silent) applyDefaultAction(dlUrl);
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
        addToHistory({ type: 'error', msg: 'Failed: ' + (error || 'Unknown error'), sourceUrl: url });
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
            if (State.currentTab === Config.TAB_KEYS.TORRENTS) Tabs.Torrents.refresh();
            UI.showToast('Torrent deleted');
        }
    }

    async function deleteCloudItem(id) {
        const { ok } = await API.del('/downloads/delete/' + id);
        if (ok) {
            State.cachedCloud = State.cachedCloud.filter(c => c.id !== id);
            if (State.currentTab === Config.TAB_KEYS.CLOUD) Tabs.Cloud.refresh();
            UI.showToast('Removed from cloud');
        }
    }

    async function cleanupTorrents() {
        const dead = State.cachedTorrents.filter(t => t.status === 'dead' || t.status === 'error');
        if (dead.length === 0) return UI.showToast('Nothing to clean');
        await Promise.all(dead.map(t => API.del('/torrents/delete/' + t.id)));
        State.cachedTorrents = State.cachedTorrents.filter(t => t.status !== 'dead' && t.status !== 'error');
        if (State.currentTab === Config.TAB_KEYS.TORRENTS) Tabs.Torrents.refresh();
        UI.showToast('Cleaned ' + dead.length + ' dead torrents');
    }

    async function convertPoints() {
        const { ok, error } = await API.post('/settings/convertPoints');
        if (ok) {
            UI.showToast('Points converted! +30 days');
            State.userProfile = null;
            State.trafficData = null;
            if (State.currentTab === Config.TAB_KEYS.SETTINGS) Tabs.Settings.render();
        } else {
            UI.showToast('Failed: ' + error, 'error');
        }
    }

    // --- Magnet handling ---

    function finishMagnetAdd(callback) {
        if (State.settings.switchToTorrentsOnMagnet) {
            if (!State.isExpanded) {
                if (State.settings.rememberLastTab) GM_setValue('rd_last_tab', Config.TAB_KEYS.TORRENTS);
                State.currentTab = Config.TAB_KEYS.TORRENTS;
                UI.toggleDashboard(true);
            } else if (State.currentTab !== Config.TAB_KEYS.TORRENTS) {
                UI.switchTab(Config.TAB_KEYS.TORRENTS);
            } else if (Tabs.Torrents) {
                Tabs.Torrents.render();
            }
        } else if (State.currentTab === Config.TAB_KEYS.TORRENTS) {
            Tabs.Torrents.render();
        }
        if (callback) callback();
    }

    async function addMagnet(magnet, callback = null) {
        if (!State.queueProcessing) UI.showToast('Sending Magnet...');
        const host = await API.resolveTorrentHost();
        const endpoint = host ? '/torrents/addMagnet?host=' + encodeURIComponent(host) : '/torrents/addMagnet';
        const { ok, data, error } = await API.post(endpoint, { magnet: magnet });
        if (!ok) {
            addToHistory({ type: 'error', msg: 'Magnet Error: ' + error, sourceUrl: magnet });
            return;
        }

        const torrentId = data.id;

        if (State.settings.magnetAction === 'all') {
            await API.post('/torrents/selectFiles/' + torrentId, { files: 'all' });
            addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
            if (!State.queueProcessing) UI.showToast('Magnet Added Successfully!');
            finishMagnetAdd(callback);
            return;
        }

        // Need file info for other modes
        const infoRes = await API.get('/torrents/info/' + torrentId);
        if (!infoRes.ok || !infoRes.data || !infoRes.data.files) {
            // Fallback: select all
            await API.post('/torrents/selectFiles/' + torrentId, { files: 'all' });
            addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
            if (!State.queueProcessing) UI.showToast('Magnet Added!');
            finishMagnetAdd(callback);
            return;
        }

        const files = infoRes.data.files;
        const title = infoRes.data.filename || 'Torrent';

        await TorrentPicker.open(torrentId, callback, files, title);
    }

    async function playTorrentVideos(torrent) {
        if (!torrent.links || !torrent.links.length) {
            UI.showToast('No files ready to play', 'error');
            return;
        }
        const videoExts = /\.(mp4|mkv|avi|mov|webm|mp3|flac|wav)$/i;
        const mediaLinks = torrent.links.filter((u) => videoExts.test(u));
        if (!mediaLinks.length) {
            UI.showToast('No playable media in torrent', 'error');
            return;
        }
        UI.showToast('Preparing playlist...');
        const playlist = [];
        for (const link of mediaLinks) {
            const name = link.split('/').pop() || torrent.filename;
            const resolved = await resolvePlayableUrl(link, name);
            playlist.push({ url: resolved.url, filename: name, mode: resolved.mode });
        }
        if (playlist.length && typeof Media !== 'undefined') {
            Media.open(playlist[0].url, playlist[0].filename, playlist, playlist[0].mode);
        }
    }

    async function deleteAllCloudItems() {
        const { ok, error } = await API.deleteAllDownloads();
        if (ok) {
            State.cachedCloud = [];
            GM_setValue('rd_cached_cloud', '[]');
            if (State.currentTab === Config.TAB_KEYS.CLOUD) Tabs.Cloud.render();
            UI.showToast('All cloud items deleted');
        } else {
            UI.showToast('Delete failed: ' + error, 'error');
        }
    }

    async function deleteAllTorrentItems() {
        const { ok, error } = await API.deleteAllTorrents();
        if (ok) {
            State.cachedTorrents = [];
            GM_setValue('rd_cached_torrents', '[]');
            if (State.currentTab === Config.TAB_KEYS.TORRENTS) Tabs.Torrents.render();
            UI.showToast('All torrents deleted');
        } else {
            UI.showToast('Delete failed: ' + error, 'error');
        }
    }

    async function renameCloudItem(id, newName) {
        const { ok, error } = await API.renameDownload(id, newName);
        if (ok) {
            const item = State.cachedCloud.find((c) => c.id === id);
            if (item) item.filename = newName;
            if (State.currentTab === Config.TAB_KEYS.CLOUD) Tabs.Cloud.refresh();
            UI.showToast('Renamed');
        } else {
            UI.showToast('Rename failed: ' + error, 'error');
        }
    }

    // --- Queue processing with parallel concurrency ---

    async function processQueue(urls, mode) {
        if (State.queueProcessing) {
            UI.showToast('Queue already running', 'error');
            return;
        }

        const concurrency = Math.max(1, parseInt(State.settings.queueConcurrency, 10) || 3);
        let completed = 0;
        const total = urls.length;
        const remaining = [...urls];

        State.queueProcessing = true;
        State.queueCancel = false;
        State.queueCompleted = 0;
        State.queueTotal = total;
        UI.setQueueActive(true);
        UI.updateQueueProgress(0, total);
        UI.showToast('Processing 0/' + total + '...');

        const worker = async () => {
            while (remaining.length > 0) {
                if (State.queueCancel) break;
                const url = remaining.shift();
                if (!url) break;
                if (url.startsWith('magnet:')) {
                    await addMagnet(url);
                } else {
                    await unrestrictLinkOrFolder(url, mode === 'queue', null, (finalUrl) => {
                        if (mode === 'dl' && finalUrl) window.open(finalUrl, '_blank');
                    });
                }
                if (State.queueCancel) break;
                completed++;
                State.queueCompleted = completed;
                UI.updateQueueProgress(completed, total);
            }
        };

        const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
        await Promise.all(workers);

        const cancelled = State.queueCancel;
        State.queueProcessing = false;
        State.queueCancel = false;
        UI.setQueueActive(false);

        if (cancelled) {
            UI.showToast('Queue cancelled at ' + completed + '/' + total);
        } else {
            UI.showToast('Queue finished (' + total + ')');
            if (State.settings.notifyOnQueueComplete) {
                UI.notify('RD Queue Complete', 'Processed ' + total + ' items');
            }
        }
    }

    // --- M3U generation ---

    async function generateM3U(name, links) {
        UI.showToast('Generating M3U...');
        let m3u = '#EXTM3U\n';
        const pending = [...links];
        const lines = [];
        const worker = async () => {
            while (pending.length) {
                const link = pending.shift();
                if (!link) break;
                const { ok, data } = await API.post('/unrestrict/link', { link });
                if (ok && data && data.download) {
                    lines.push('#EXTINF:-1,' + data.filename + '\n' + data.download);
                }
            }
        };
        const pool = Math.min(2, links.length);
        await Promise.all(Array.from({ length: pool }, () => worker()));
        m3u += lines.join('\n') + (lines.length ? '\n' : '');
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

    function exportHistoryJson() {
        if (!State.linkHistory.length) { UI.showToast('No history to export', 'error'); return; }
        const blob = new Blob([JSON.stringify(State.linkHistory, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = DOM.create('a', { href: url, download: 'rd-link-history.json' });
        a.click();
        URL.revokeObjectURL(url);
        UI.showToast('History Exported');
    }

    function isValidHistoryItem(item) {
        if (!item || typeof item !== 'object' || !item.type) return false;
        if (item.type === 'error') return typeof item.msg === 'string';
        if (item.type === 'success') return typeof item.name === 'string' && !!(item.url || item.download);
        return false;
    }

    async function retryHistoryItem(item) {
        const url = item && item.sourceUrl;
        if (!url) return UI.showToast('No source URL to retry', 'error');
        UI.showToast('Retrying...');
        if (url.startsWith('magnet:')) await addMagnet(url);
        else await unrestrictLinkOrFolder(url);
    }

    async function retryAllErrors() {
        const retryable = State.linkHistory.filter(h => h.type === 'error' && h.sourceUrl);
        if (!retryable.length) return UI.showToast('No retryable errors', 'error');
        UI.showToast('Retrying ' + retryable.length + ' item(s)...');
        for (const item of retryable) {
            if (item.sourceUrl.startsWith('magnet:')) await addMagnet(item.sourceUrl);
            else await unrestrictLinkOrFolder(item.sourceUrl, true);
        }
        UI.showToast('Retry complete');
    }

    function importHistoryJson(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!Array.isArray(data)) throw new Error('Expected array');
                const valid = data.filter(isValidHistoryItem);
                if (!valid.length) throw new Error('No valid items');
                State.linkHistory = State.linkHistory.concat(valid).slice(-500);
                GM_setValue('rd_link_history', JSON.stringify(State.linkHistory));
                if (State.currentTab === Config.TAB_KEYS.LINKS && Tabs.Links) Tabs.Links.render();
                UI.showToast(valid.length + ' item(s) imported');
            } catch (e) {
                UI.showToast('Invalid history file', 'error');
            }
        };
        reader.readAsText(file);
    }


// Torrent file picker — shared modal for magnets, uploads, and pending torrents
    // =========================================================================

    const TorrentPicker = {
        async open(torrentId, callback, preloadedFiles, preloadedTitle) {
            let files = preloadedFiles;
            let title = preloadedTitle || 'Select Files';

            if (!files) {
                const infoRes = await API.get('/torrents/info/' + torrentId);
                if (!infoRes.ok || !infoRes.data || !infoRes.data.files) {
                    UI.showToast('Could not load torrent files', 'error');
                    return;
                }
                files = infoRes.data.files;
                title = infoRes.data.filename || title;
            }

            if (State.settings.magnetAction !== 'manual' && State.settings.magnetAction !== 'video' && State.settings.magnetAction !== 'smart') {
                this._showModal(torrentId, files, title, callback);
                return;
            }

            if (State.settings.magnetAction === 'manual') {
                this._showModal(torrentId, files, title, callback);
                return;
            }

            if (State.settings.magnetAction === 'video') {
                const videoExts = /\.(mp4|mkv|avi|mov|webm)$/i;
                let largestId = null, maxSize = 0;
                files.forEach((f) => {
                    if (videoExts.test(f.path) && f.bytes > maxSize) { maxSize = f.bytes; largestId = f.id; }
                });
                if (largestId) {
                    await API.post('/torrents/selectFiles/' + torrentId, { files: String(largestId) });
                    addToHistory({ type: 'success', name: 'Main Video Added', url: '#', size: formatBytes(maxSize) });
                    if (!State.queueProcessing) UI.showToast('Main Video Added!');
                    finishMagnetAdd(callback);
                    return;
                }
            }

            if (State.settings.magnetAction === 'smart' || State.settings.magnetAction === 'video') {
                let fileIds = 'all';
                if (State.settings.smartFilter) {
                    const exts = State.settings.filterExts.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
                    if (exts.length > 0) {
                        const extRegex = new RegExp('\\.(' + exts.join('|') + ')$', 'i');
                        const validFiles = files.filter((f) => !extRegex.test(f.path));
                        if (validFiles.length > 0) fileIds = validFiles.map((f) => f.id).join(',');
                    }
                }
                await API.post('/torrents/selectFiles/' + torrentId, { files: fileIds });
                addToHistory({ type: 'success', name: title, url: '#', size: 'Pending' });
                if (!State.queueProcessing) UI.showToast('Torrent started!');
                finishMagnetAdd(callback);
                return;
            }

            this._showModal(torrentId, files, title, callback);
        },

        _showModal(torrentId, files, title, callback) {
            const container = DOM.create('div', { style: 'display:flex;flex-direction:column;gap:10px;max-height:60vh;' });

            const headerRow = DOM.create('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px;' });
            const selectAllBtn = DOM.create('button', { textContent: 'Select All', className: 'rd-input-btn' });
            const selectNoneBtn = DOM.create('button', { textContent: 'Select None', className: 'rd-input-btn' });
            headerRow.append(selectAllBtn, selectNoneBtn);
            container.append(headerRow);

            const fileList = DOM.create('div', { style: 'overflow-y:auto;max-height:50vh;display:flex;flex-direction:column;gap:4px;' });
            const checkboxes = [];

            files.forEach((f) => {
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

            selectAllBtn.addEventListener('click', () => checkboxes.forEach((cb) => { cb.checked = true; }));
            selectNoneBtn.addEventListener('click', () => checkboxes.forEach((cb) => { cb.checked = false; }));

            const cancelBtn = DOM.create('button', { textContent: 'Cancel', className: 'rd-input-btn' });
            const startBtn = DOM.create('button', { textContent: 'Start Download', className: 'rd-input-btn primary' });
            const modal = UI.showModal(title, [container], [cancelBtn, startBtn]);

            cancelBtn.addEventListener('click', () => {
                modal.close();
                API.del('/torrents/delete/' + torrentId);
            });

            startBtn.addEventListener('click', async () => {
                const selectedIds = checkboxes.filter((cb) => cb.checked).map((cb) => cb.dataset.fileId);
                if (selectedIds.length === 0) {
                    UI.showToast('Select at least one file', 'error');
                    return;
                }
                await API.post('/torrents/selectFiles/' + torrentId, { files: selectedIds.join(',') });
                addToHistory({ type: 'success', name: title, url: '#', size: selectedIds.length + ' files' });
                UI.showToast('Torrent started with ' + selectedIds.length + ' files!');
                modal.close();
                finishMagnetAdd(callback);
            });
        }
    };

    async function uploadTorrentFile(file, callback) {
        if (!file || !file.name.endsWith('.torrent')) {
            UI.showToast('Not a .torrent file', 'error');
            return;
        }
        UI.showToast('Uploading torrent...');
        const host = await API.resolveTorrentHost();
        const endpoint = host ? '/torrents/addTorrent?host=' + encodeURIComponent(host) : '/torrents/addTorrent';
        const res = await API.upload(endpoint, file);
        if (!res.ok || !res.data || !res.data.id) {
            UI.showToast('Upload failed: ' + (res.error || 'Unknown'), 'error');
            return;
        }
        UI.showToast('Torrent uploaded — pick files');
        await TorrentPicker.open(res.data.id, callback);
    }


// ===================== Tabs (Links + Page) =====================

    const Tabs = {};


    function makeDeselectAllBtn(checkboxSelector, selectAllChk) {
        return DOM.create('button', {
            className: 'rd-input-btn', textContent: 'None', style: 'margin:0;',
            onClick: () => {
                document.querySelectorAll(checkboxSelector).forEach(cb => { cb.checked = false; });
                if (selectAllChk) { selectAllChk.checked = false; selectAllChk.indeterminate = false; }
                UI.showToast('Selection cleared');
            }
        });
    }

    function makeInvertBtn(checkboxSelector, selectAllChk) {
        return DOM.create('button', {
            className: 'rd-input-btn', textContent: 'Invert', style: 'margin:0;',
            onClick: () => {
                const boxes = document.querySelectorAll(checkboxSelector);
                let checked = 0;
                boxes.forEach(cb => { cb.checked = !cb.checked; if (cb.checked) checked++; });
                if (selectAllChk) {
                    selectAllChk.checked = checked === boxes.length;
                    selectAllChk.indeterminate = checked > 0 && checked < boxes.length;
                }
                UI.showToast('Inverted (' + checked + ' selected)');
            }
        });
    }

    function makeCopyUrlsBtn(getUrls) {
        return DOM.create('button', {
            className: 'rd-input-btn', textContent: 'Copy URLs', style: 'margin:0;',
            onClick: (e) => {
                const urls = getUrls();
                if (!urls.length) { UI.showToast('No URLs to copy', 'error'); return; }
                UI.copyToClipboard(urls.join('\n'), e.currentTarget);
                UI.showToast('Copied ' + urls.length + ' URL' + (urls.length === 1 ? '' : 's'));
            }
        });
    }

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

    function isPageLinkUncached(url) {
        const cached = State.pageLinkCache.get(url);
        if (cached === 'cached') return false;
        if (cached === 'uncached') return true;
        if (url.startsWith('magnet:')) {
            for (const link of document.querySelectorAll('a.rd-processed')) {
                if ((link.href || '') !== url) continue;
                const icon = link.nextElementSibling;
                if (icon && icon.classList.contains('rd-inline-icon')) {
                    return icon.classList.contains('uncached') || !icon.classList.contains('cached');
                }
                return true;
            }
        }
        return cached !== 'cached';
    }

    function getPageLinkBadge(url, linkType) {
        if (linkType === 'magnet') {
            const cached = State.pageLinkCache.get(url);
            if (cached === 'cached') return { text: 'Cached', color: 'var(--rd-success)' };
            if (cached === 'uncached') return { text: 'Uncached', color: 'var(--rd-warning)' };
            return { text: 'Magnet', color: 'var(--rd-text-secondary)' };
        }
        const status = State.pageLinkCache.get(url);
        if (status === 'cached') return { text: 'Cached', color: 'var(--rd-success)' };
        if (status === 'uncached') return { text: 'Uncached', color: 'var(--rd-warning)' };
        if (status === 'down') return { text: 'Host down', color: 'var(--rd-danger)' };
        return { text: 'Unknown', color: 'var(--rd-text-secondary)' };
    }
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


    Tabs.Links = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            // Input area
            const inputArea = DOM.create('div', { className: 'rd-input-area' });
            const textarea = DOM.create('textarea', {
                id: 'rd-manual-input', className: 'rd-textarea',
                placeholder: 'Paste links, folders, magnets, or Base64...',
                onKeydown: (e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleManualInput();
                    }
                }
            });
            const btnRow = DOM.create('div', { style: 'display:flex; gap:8px; margin-top:8px;' });
            const unrestrictBtn = DOM.create('button', {
                id: 'rd-btn-unrestrict', className: 'rd-input-btn primary',
                textContent: 'Unrestrict', style: 'flex:2;',
                onClick: () => handleManualInput()
            });
            const pasteBtn = DOM.create('button', {
                id: 'rd-btn-paste', className: 'rd-input-btn',
                textContent: 'Paste', style: 'flex:1;',
                onClick: async () => {
                    try {
                        const text = await navigator.clipboard.readText();
                        textarea.value = text;
                    } catch (e) {
                        UI.showToast('Clipboard access denied', 'error');
                    }
                }
            });
            const clearBtn = DOM.create('button', {
                id: 'rd-btn-clear', className: 'rd-input-btn',
                textContent: 'Clear', style: 'flex:1;',
                onClick: () => {
                    if (!confirm('Clear all link history?')) return;
                    State.linkHistory = [];
                    GM_setValue('rd_link_history', '[]');
                    Tabs.Links.render();
                    UI.showToast('History Cleared');
                }
            });
            btnRow.append(unrestrictBtn, pasteBtn, clearBtn);

            // Export controls
            const exportRow = DOM.create('div', { style: 'display:flex; justify-content:flex-end; gap:8px; align-items:center; margin-top:8px;' });
            exportRow.append(buildExportControls('local'));
            exportRow.append(
                DOM.create('button', {
                    className: 'rd-input-btn', textContent: 'Copy All URLs', style: 'margin:0;',
                    onClick: (e) => {
                        const urls = State.linkHistory
                            .filter(h => h.type === 'success')
                            .map(h => h.download || h.url)
                            .filter(u => u && u !== '#');
                        if (!urls.length) { UI.showToast('No URLs to copy', 'error'); return; }
                        UI.copyToClipboard(urls.join('\n'), e.currentTarget);
                        UI.showToast('Copied ' + urls.length + ' URL' + (urls.length === 1 ? '' : 's'));
                    }
                }),
                DOM.create('button', {
                    className: 'rd-input-btn', textContent: 'Import JSON', style: 'margin:0;',
                    onClick: () => {
                        const input = DOM.create('input', { type: 'file', accept: '.json' });
                        input.addEventListener('change', () => {
                            const file = input.files[0];
                            if (!file) return;
                            importHistoryJson(file);
                        });
                        input.click();
                    }
                }),
                DOM.create('button', {
                    className: 'rd-input-btn', textContent: 'Export JSON', style: 'margin:0;',
                    onClick: () => exportHistoryJson()
                })
            );

            inputArea.append(textarea, btnRow, exportRow);

            const searchInput = DOM.create('input', {
                type: 'text', id: 'rd-search-links', className: 'rd-search-bar',
                placeholder: 'Search History...', value: State.linksHistoryFilter || '',
                style: 'margin:0; margin-top:8px;',
                onInput: (e) => {
                    State.linksHistoryFilter = e.target.value;
                    const logList = document.getElementById('rd-links-history');
                    if (logList) this._renderHistory(logList, State.linksHistoryFilter);
                }
            });

            const typeFilter = State.linksHistoryTypeFilter || 'all';
            const filterRow = DOM.create('div', { style: 'display:flex; gap:6px; margin-top:8px;' });
            [['all', 'All'], ['success', 'Success'], ['error', 'Errors']].forEach(([val, label]) => {
                const chip = DOM.create('button', {
                    className: 'rd-input-btn' + (typeFilter === val ? ' primary' : ''),
                    textContent: label,
                    style: 'flex:1; margin:0;',
                    onClick: () => {
                        State.linksHistoryTypeFilter = val;
                        filterRow.querySelectorAll('button').forEach(b => b.classList.remove('primary'));
                        chip.classList.add('primary');
                        const logList = document.getElementById('rd-links-history');
                        if (logList) this._renderHistory(logList, State.linksHistoryFilter);
                    }
                });
                filterRow.append(chip);
            });
            const retryErrorsBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Retry Errors', style: 'margin:0;',
                onClick: () => retryAllErrors()
            });
            filterRow.append(retryErrorsBtn);

            // History list
            const logList = DOM.create('div', { className: 'rd-log-list', id: 'rd-links-history' });
            this._renderHistory(logList, State.linksHistoryFilter);

            area.append(inputArea, searchInput, filterRow, logList);
        },

        refresh() {
            const logList = document.getElementById('rd-links-history');
            if (logList) this._renderHistory(logList, State.linksHistoryFilter);
        },

        _getFilteredHistory(filterText) {
            let filtered = State.linkHistory;
            const typeFilter = State.linksHistoryTypeFilter || 'all';
            if (typeFilter === 'success') filtered = filtered.filter((item) => item.type === 'success');
            else if (typeFilter === 'error') filtered = filtered.filter((item) => item.type === 'error');
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter((item) => {
                    const hay = [(item.name || ''), (item.url || ''), (item.msg || '')].join(' ').toLowerCase();
                    return hay.includes(lf);
                });
            }
            const reversed = [];
            for (let i = filtered.length - 1; i >= 0; i--) reversed.push(filtered[i]);
            return reversed;
        },

        _renderHistory(container, filterText) {
            const filtered = this._getFilteredHistory(filterText);
            ListRenderer.patch(container, filtered, {
                key: (item) => (item.url || item.msg || '') + '|' + (item.time || '') + '|' + item.type,
                compare: (a, b) => JSON.stringify(a) === JSON.stringify(b),
                emptyMessage: State.linkHistory.length === 0
                    ? 'No history. Paste links below or drag & drop.'
                    : 'No matching history.',
                render: (item) => this._buildHistoryItem(item)
            });
        },

        _buildHistoryItem(item) {
            if (item.type === 'error') {
                const content = [
                    DOM.create('div', { className: 'rd-item-content' }, [
                        DOM.create('div', { className: 'rd-filename', style: 'color:var(--rd-danger);', textContent: item.msg || 'Error' }),
                        DOM.create('div', { className: 'rd-meta' }, [
                            DOM.create('span', { textContent: item.time || '' }),
                            item.sourceUrl ? DOM.create('span', {
                                textContent: item.sourceUrl.length > 40 ? item.sourceUrl.slice(0, 40) + '…' : item.sourceUrl,
                                title: item.sourceUrl,
                                style: 'margin-left:8px;opacity:0.7;'
                            }) : null
                        ].filter(Boolean)),
                        item.sourceUrl ? DOM.create('div', { className: 'rd-btn-group' }, [
                            DOM.create('button', {
                                className: 'rd-action-btn', textContent: 'Retry',
                                onClick: () => retryHistoryItem(item)
                            })
                        ]) : null
                    ].filter(Boolean))
                ];
                return DOM.create('div', { className: 'rd-log-item error' }, content);
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
                    onClick: () => playMediaUrl(item.download || item.url, item.name)
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
                row.addEventListener('dblclick', () => UI.copyToClipboard(item.url));
                addMobileLongPress(row, [
                    { label: 'Copy URL', action: () => UI.copyToClipboard(item.url) },
                    { label: 'Download', action: () => window.open(item.url, '_blank') }
                ]);
            }
            return row;
        }
    };


    Tabs.Page = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);
            API.get('/hosts/status').then(({ ok, data }) => { if (ok && data) State.liveHosts = data; });
            this.batchCheckLinks();

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

            const selectUncachedBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Select Uncached', style: 'margin:0;',
                onClick: () => {
                    let count = 0;
                    document.querySelectorAll('.rd-page-chk').forEach(cb => {
                        cb.checked = isPageLinkUncached(cb.value);
                        if (cb.checked) count++;
                    });
                    selectAllChk.checked = false;
                    selectAllChk.indeterminate = count > 0 && count < document.querySelectorAll('.rd-page-chk').length;
                    UI.showToast(count ? 'Selected ' + count + ' uncached' : 'No uncached links found', count ? 'success' : 'error');
                }
            });
            const invertSelBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Invert', style: 'margin:0;',
                onClick: () => {
                    const boxes = document.querySelectorAll('.rd-page-chk');
                    let checked = 0;
                    boxes.forEach(cb => { cb.checked = !cb.checked; if (cb.checked) checked++; });
                    selectAllChk.checked = checked === boxes.length;
                    selectAllChk.indeterminate = checked > 0 && checked < boxes.length;
                    UI.showToast('Inverted selection (' + checked + ' selected)');
                }
            });

            const dlSelBtn = DOM.create('button', {
                className: 'rd-input-btn primary', textContent: 'DL Selected', style: 'margin:0;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-page-chk:checked')).map(c => c.value);
                    if (!sel.length) return UI.showToast('None selected!', 'error');
                    UI.showToast('Starting ' + sel.length + ' downloads...');
                    processQueue(sel, 'dl');
                }
            });
            const queueStatus = DOM.create('span', {
                id: 'rd-page-queue-status',
                className: 'rd-queue-status',
                style: 'font-size:11px;color:var(--rd-accent);font-weight:600;display:none;'
            });
            const queueBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Queue', style: 'margin:0; background:var(--rd-accent); color:var(--rd-bg-base); border:none;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-page-chk:checked')).map(c => c.value);
                    if (!sel.length) return UI.showToast('None selected!', 'error');
                    queueStatus.textContent = sel.length + ' queued';
                    queueStatus.style.display = '';
                    queueBtn.textContent = 'Queued ' + sel.length;
                    UI.showToast('Queued ' + sel.length + ' items');
                    UI.openTab(Config.TAB_KEYS.LINKS, () => processQueue(sel, 'queue'));
                }
            });

            leftGroup.append(
                selectAllLabel,
                makeDeselectAllBtn('.rd-page-chk', selectAllChk),
                selectUncachedBtn,
                invertSelBtn,
                makeCopyUrlsBtn(() => Array.from(document.querySelectorAll('.rd-page-chk:checked')).map(c => c.value).filter(u => u)),
                dlSelBtn,
                queueBtn,
                queueStatus
            );
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
                if (State.pageCollapsedDomains.has(domain)) groupContent.style.display = 'none';
                groupHeader.addEventListener('click', (e) => {
                    if (e.target === groupChk) return;
                    const hiding = groupContent.style.display !== 'none';
                    groupContent.style.display = hiding ? 'none' : 'flex';
                    if (hiding) State.pageCollapsedDomains.add(domain);
                    else State.pageCollapsedDomains.delete(domain);
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
                            UI.openTab(Config.TAB_KEYS.LINKS, () => {
                                if (link.url.startsWith('magnet:')) addMagnet(link.url);
                                else unrestrictLinkOrFolder(link.url);
                            });
                        }
                    });

                    const badge = getPageLinkBadge(link.url, link.type);
                    const item = DOM.create('div', { className: 'rd-log-item' }, [
                        chk,
                        DOM.create('div', { className: 'rd-item-content' }, [
                            DOM.create('div', { className: 'rd-filename', title: link.url, textContent: icon + ' ' + link.text }),
                            DOM.create('div', { style: 'display:flex; gap:8px; align-items:center;' }, [
                                DOM.create('span', {
                                    textContent: badge.text,
                                    style: 'font-size:9px; font-weight:600; color:' + badge.color + ';'
                                }),
                                DOM.create('span', {
                                    style: 'font-size:10px; color:var(--rd-text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;',
                                    textContent: link.url
                                })
                            ]),
                            DOM.create('div', { className: 'rd-btn-group' }, [oneClickBtn, queueItemBtn])
                        ])
                    ]);
                    addMobileLongPress(item, [
                        { label: '1-Click', action: () => oneClickBtn.click() },
                        { label: 'Queue', action: () => queueItemBtn.click() },
                        { label: 'Copy URL', action: () => UI.copyToClipboard(link.url) }
                    ]);
                    groupContent.append(item);
                }

                logList.append(groupHeader, groupContent);
            }

            area.append(controlBar, logList);
        },

        refresh() {
            this.render();
        },

        async batchCheckLinks() {
            const hostUrls = [];
            for (const [url, data] of State.scannedLinksMap.entries()) {
                if (data.type === 'host' && !State.pageLinkCache.has(url)) hostUrls.push(url);
            }
            for (const url of hostUrls.slice(0, 50)) {
                if (State.linkCheckCache.has(url)) {
                    const info = State.linkCheckCache.get(url);
                    State.pageLinkCache.set(url, info.includes('Unsupported') ? 'uncached' : 'cached');
                    continue;
                }
                const { ok, data } = await API.post('/unrestrict/check', { link: url });
                if (ok && data) {
                    State.pageLinkCache.set(url, data.supported ? 'cached' : 'uncached');
                    if (data.filename) {
                        State.linkCheckCache.set(url, data.filename + ' \u2014 ' + (data.filesize ? formatBytes(data.filesize) : 'Unknown'));
                    }
                }
            }
            if (State.currentTab === Config.TAB_KEYS.PAGE && State.isExpanded) {
                const area = document.getElementById('rd-content-area');
                if (area && area.querySelector('.rd-page-chk')) this.render();
            }
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
            const refreshBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Refresh', style: 'margin:0;',
                onClick: () => this._fetchTorrents(true)
            });
            leftGroup.append(
                selectAllLabel,
                makeDeselectAllBtn('.rd-torrent-chk', selectAllChk),
                makeInvertBtn('.rd-torrent-chk', selectAllChk),
                refreshBtn,
                makeCopyUrlsBtn(() => {
                    const selIds = new Set(Array.from(document.querySelectorAll('.rd-torrent-chk:checked')).map(c => c.value));
                    const urls = [];
                    for (const t of State.cachedTorrents) {
                        if (!selIds.has(String(t.id))) continue;
                        if (t.status !== 'downloaded' || !t.links?.length) continue;
                        t.links.forEach(u => { if (u && u !== '#') urls.push(u); });
                    }
                    return urls;
                }),
                delSelBtn
            );

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
            const statusFilter = State.torrentStatusFilter || 'all';
            const statusRow = DOM.create('div', { style: 'display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;' });
            [['all', 'All'], ['active', 'Active'], ['done', 'Done'], ['error', 'Errors']].forEach(([val, label]) => {
                statusRow.append(DOM.create('button', {
                    className: 'rd-input-btn' + (statusFilter === val ? ' primary' : ''),
                    textContent: label, style: 'margin:0; flex:1; min-width:60px;',
                    onClick: () => {
                        State.torrentStatusFilter = val;
                        this.render();
                    }
                }));
            });
            const addPanel = DOM.create('div', { style: 'display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;' });
            const magnetInput = DOM.create('input', {
                type: 'text', className: 'rd-search-bar', placeholder: 'Paste magnet link...',
                style: 'margin:0; flex:1; min-width:140px;'
            });
            const addMagnetBtn = DOM.create('button', {
                className: 'rd-input-btn primary', textContent: 'Add Magnet', style: 'margin:0;',
                onClick: () => {
                    const m = magnetInput.value.trim();
                    if (!m.startsWith('magnet:')) return UI.showToast('Invalid magnet', 'error');
                    addMagnet(m);
                    magnetInput.value = '';
                }
            });
            const torrentFileInput = DOM.create('input', { type: 'file', accept: '.torrent', style: 'display:none;' });
            torrentFileInput.addEventListener('change', () => {
                const file = torrentFileInput.files[0];
                if (file) uploadTorrentFile(file);
                torrentFileInput.value = '';
            });
            const uploadBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Upload .torrent', style: 'margin:0;',
                onClick: () => torrentFileInput.click()
            });
            const deleteAllBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete All', style: 'margin:0;',
                onClick: () => {
                    if (prompt('Type DELETE ALL to remove every torrent') === 'DELETE ALL') deleteAllTorrentItems();
                }
            });
            addPanel.append(magnetInput, addMagnetBtn, uploadBtn, deleteAllBtn, torrentFileInput);

            controlBar.append(topRow, addPanel, searchInput, statusRow);

            const listContainer = DOM.create('div', { id: 'rd-torrent-list-container', className: 'rd-log-list' });
            area.append(controlBar, listContainer);
            addPullToRefresh(listContainer, () => this._fetchTorrents(true));
            this._renderList('');
            this._fetchActiveCount();
            this.startPolling();
        },

        async _fetchActiveCount() {
            const res = await API.getTorrentsActiveCount();
            if (res.ok && typeof res.data === 'number') {
                State.activeTorrentCount = res.data;
                UI.updateHeaderQuota();
            }
        },

        refresh() {
            const searchInput = document.getElementById('rd-search-torrents');
            const filter = searchInput ? searchInput.value : '';
            this._renderList(filter);
        },

        _getFilteredTorrents(filterText) {
            let filtered = State.cachedTorrents;
            const statusFilter = State.torrentStatusFilter || 'all';
            if (statusFilter === 'active') {
                filtered = filtered.filter((t) => t.status !== 'downloaded' && t.status !== 'dead' && t.status !== 'error');
            } else if (statusFilter === 'done') {
                filtered = filtered.filter((t) => t.status === 'downloaded');
            } else if (statusFilter === 'error') {
                filtered = filtered.filter((t) => t.status === 'dead' || t.status === 'error');
            }
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter((t) => t.filename.toLowerCase().includes(lf));
            }
            return filtered;
        },

        _renderList(filterText) {
            const container = document.getElementById('rd-torrent-list-container');
            if (!container) return;
            const filtered = this._getFilteredTorrents(filterText);
            ListRenderer.patch(container, filtered, {
                key: (t) => t.id,
                compare: ListRenderer.torrentCompare,
                emptyMessage: State.cachedTorrents.length === 0 ? 'No active torrents.' : 'No matching torrents.',
                render: (t) => this._buildTorrentItem(t)
            });
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

            const actionChildren = [];
            if (t.status === 'waiting_files_selection') {
                actionChildren.push(DOM.create('span', {
                    className: 'rd-dl-badge', textContent: 'Pick Files',
                    style: 'background:var(--rd-accent);',
                    onClick: () => TorrentPicker.open(t.id)
                }));
            }
            if (isDone && t.links && t.links.length > 0) {
                actionChildren.push(DOM.create('span', {
                    className: 'rd-dl-badge', textContent: 'Play',
                    onClick: () => playTorrentVideos(t)
                }));
                if (t.links.length === 1) {
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge', textContent: '1 File',
                        dataset: { link: t.links[0] },
                        onClick: () => { UI.openTab(Config.TAB_KEYS.LINKS, () => unrestrictLink(t.links[0], false)); }
                    }));
                } else {
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge m3u', textContent: 'M3U',
                        onClick: () => generateM3U(t.filename, t.links)
                    }));
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge', textContent: 'All (' + t.links.length + ')',
                        onClick: () => { UI.openTab('links', () => processQueue([...t.links], 'queue')); }
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

            const row = DOM.create('div', { className: 'rd-log-item' + (isDone ? ' success' : '') }, [
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
            addMobileLongPress(row, [
                { label: 'Delete', action: () => deleteTorrent(t.id) },
                ...(isDone && t.links?.length ? [{ label: 'Play', action: () => playTorrentVideos(t) }] : []),
                ...(t.status === 'waiting_files_selection' ? [{ label: 'Pick Files', action: () => TorrentPicker.open(t.id) }] : [])
            ]);
            return row;
        },

        startPolling() {
            this.stopPolling();
            if (State.apiKey && !document.hidden) {
                this._fetchTorrents(true);
                const pollMs = Math.max(3, parseInt(State.settings.torrentPollInterval, 10) || 4) * 1000;
                this._pollingInterval = setInterval(() => {
                    if (document.hidden) return;
                    this._fetchTorrents(false);
                }, pollMs);
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
                        UI.notify('RD Download Ready', t.filename);
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
            State.cloudPage = 1;
            area.append(DOM.create('div', { style: 'text-align:center; padding:16px; color:var(--rd-text-secondary);', textContent: 'Loading…' }));
            this._fetchCloud(true);
        },

        refresh() {
            const searchInput = document.getElementById('rd-search-cloud');
            const filter = searchInput ? searchInput.value : '';
            this._renderList(filter);
        },

        async _fetchCloud(reset) {
            const limit = parseInt(State.settings.cloudLimit, 10) || 100;
            if (reset) State.cloudPage = 1;
            const page = State.cloudPage || 1;
            const { ok, data, error } = await API.getDownloadsPage(limit, page);
            if (State.currentTab !== Config.TAB_KEYS.CLOUD) return;
            if (!ok) {
                if (loadOfflineData('rd_cached_cloud', 'cachedCloud')) {
                    this._renderBase();
                } else {
                    const area = document.getElementById('rd-content-area');
                    if (area) { DOM.clear(area); area.append(DOM.create('div', { style: 'padding:16px; color:var(--rd-danger);', textContent: 'Error: ' + error })); }
                }
                return;
            }
            const batch = data || [];
            if (reset || page === 1) {
                State.cachedCloud = batch;
            } else {
                const existingIds = new Set(State.cachedCloud.map((c) => c.id));
                batch.forEach((item) => { if (!existingIds.has(item.id)) State.cachedCloud.push(item); });
            }
            State.cloudHasMore = batch.length >= limit;
            GM_setValue('rd_cached_cloud', JSON.stringify(State.cachedCloud));
            this._renderBase();
        },

        async _loadMore() {
            State.cloudPage = (State.cloudPage || 1) + 1;
            UI.showToast('Loading more...');
            await this._fetchCloud(false);
        },

        _renderBase() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            const controlBar = DOM.create('div', { className: 'rd-control-bar', style: 'flex-direction:column; align-items:stretch;' });
            const topRow = DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:8px;' });

            const leftGroup = DOM.create('div', { className: 'rd-control-group' });
            const selectAllLabel = DOM.create('label', { style: 'display:flex; align-items:center; gap:5px; font-size:12px; cursor:pointer; font-weight:600;' });
            const selectAllChk = DOM.create('input', { type: 'checkbox', id: 'rd-cloud-chk-all', className: 'rd-checkbox' });
            selectAllChk.addEventListener('change', () => document.querySelectorAll('.rd-cloud-chk').forEach((c) => { c.checked = selectAllChk.checked; }));
            selectAllLabel.append(selectAllChk, DOM.text('All'));

            const delSelBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete', style: 'margin:0;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-cloud-chk:checked')).map((c) => c.value);
                    if (!sel.length) return;
                    if (confirm('Delete ' + sel.length + ' files from cloud?')) {
                        sel.forEach((id) => deleteCloudItem(id));
                    }
                }
            });
            const cloudRefreshBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Refresh', style: 'margin:0;',
                onClick: () => this.render()
            });
            const deleteAllBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete All', style: 'margin:0;',
                onClick: () => {
                    if (prompt('Type DELETE ALL to wipe cloud history') === 'DELETE ALL') deleteAllCloudItems();
                }
            });
            leftGroup.append(
                selectAllLabel,
                makeDeselectAllBtn('.rd-cloud-chk', selectAllChk),
                makeInvertBtn('.rd-cloud-chk', selectAllChk),
                cloudRefreshBtn,
                makeCopyUrlsBtn(() => Array.from(document.querySelectorAll('.rd-cloud-chk:checked')).map((c) => c.dataset.url).filter((u) => u && u !== '#')),
                delSelBtn,
                deleteAllBtn
            );
            topRow.append(leftGroup, buildExportControls('cloud'));

            const bottomRow = DOM.create('div', { style: 'display:flex; gap:6px; align-items:center; margin-top:8px;' });
            const searchInput = DOM.create('input', {
                type: 'text', id: 'rd-search-cloud', className: 'rd-search-bar',
                placeholder: 'Search Cloud...', style: 'margin:0; flex:1;',
                onInput: () => this._renderList(searchInput.value)
            });
            const sortSelect = DOM.create('select', { id: 'rd-cloud-sort', className: 'rd-select', style: 'padding:6px; margin:0;' });
            ['newest:Newest', 'oldest:Oldest', 'largest:Largest', 'smallest:Smallest'].forEach((opt) => {
                const [val, label] = opt.split(':');
                sortSelect.append(DOM.create('option', { value: val, textContent: label }));
            });
            sortSelect.addEventListener('change', () => this._renderList(searchInput.value));
            bottomRow.append(searchInput, sortSelect);

            controlBar.append(topRow, bottomRow);

            const listContainer = DOM.create('div', { id: 'rd-cloud-list-container', className: 'rd-log-list' });
            const loadMoreBtn = DOM.create('button', {
                id: 'rd-cloud-load-more',
                className: 'rd-input-btn',
                textContent: 'Load More',
                style: 'width:100%; margin-top:8px; display:' + (State.cloudHasMore ? 'block' : 'none') + ';',
                onClick: () => this._loadMore()
            });
            area.append(controlBar, listContainer, loadMoreBtn);
            addPullToRefresh(listContainer, () => this.render());
            this._renderList('');
        },

        _getFilteredCloud(filterText) {
            let filtered = [...State.cachedCloud];
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter((item) => item.filename.toLowerCase().includes(lf));
            }
            const sortMode = document.getElementById('rd-cloud-sort')?.value || 'newest';
            filtered.sort((a, b) => {
                if (sortMode === 'newest') return new Date(b.generated) - new Date(a.generated);
                if (sortMode === 'oldest') return new Date(a.generated) - new Date(b.generated);
                if (sortMode === 'largest') return b.filesize - a.filesize;
                return a.filesize - b.filesize;
            });
            return filtered;
        },

        _renderList(filterText) {
            const container = document.getElementById('rd-cloud-list-container');
            if (!container) return;
            const filtered = this._getFilteredCloud(filterText);
            ListRenderer.patch(container, filtered, {
                key: (item) => item.id,
                compare: ListRenderer.cloudCompare,
                emptyMessage: 'Cloud history empty.',
                render: (item) => this._buildCloudItem(item)
            });
            const loadMore = document.getElementById('rd-cloud-load-more');
            if (loadMore) loadMore.style.display = State.cloudHasMore ? 'block' : 'none';
        },

        _buildCloudItem(item) {
            const isMedia = /\.(mp4|mkv|avi|mov|mp3|flac|wav|jpg|png|webp)$/i.test(item.filename);
            const btns = [
                DOM.create('button', { className: 'rd-action-btn', textContent: 'DL', onClick: () => window.open(item.download, '_blank') }),
                DOM.create('button', { className: 'rd-action-btn', textContent: 'URL', onClick: () => UI.copyToClipboard(item.download) }),
                DOM.create('button', {
                    className: 'rd-action-btn', textContent: 'Rename',
                    onClick: () => {
                        const newName = prompt('New filename:', item.filename);
                        if (newName && newName !== item.filename) renameCloudItem(item.id, newName);
                    }
                })
            ];
            if (isMedia) {
                btns.push(DOM.create('button', {
                    className: 'rd-action-btn', textContent: 'Play',
                    onClick: () => playMediaUrl(item.download, item.filename, item.id)
                }));
            }

            const chk = DOM.create('input', { type: 'checkbox', className: 'rd-cloud-chk rd-checkbox', value: item.id, dataset: { url: item.download } });
            const delBtn = DOM.create('span', {
                style: 'color:var(--rd-danger); cursor:pointer; padding:0 4px; font-size:16px; font-weight:bold;',
                textContent: '\u2715',
                onClick: () => deleteCloudItem(item.id)
            });

            const row = DOM.create('div', { className: 'rd-log-item success' }, [
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
            ]);
            addMobileLongPress(row, [
                { label: 'Copy URL', action: () => UI.copyToClipboard(item.download) },
                { label: 'Download', action: () => window.open(item.download, '_blank') },
                ...(isMedia ? [{ label: 'Play', action: () => playMediaUrl(item.download, item.filename, item.id) }] : []),
                { label: 'Delete', action: () => deleteCloudItem(item.id) }
            ]);
            return row;
        }
    };


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
            if (State.currentTab !== Config.TAB_KEYS.SETTINGS) return;
            if (!userRes.ok) { DOM.clear(area); area.append(DOM.create('div', { style: 'padding:16px; color:var(--rd-danger);', textContent: 'Failed to load account info' })); return; }
            State.userProfile = userRes.data;

            const trafficRes = await API.get('/traffic');
            if (State.currentTab !== Config.TAB_KEYS.SETTINGS) return;
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
            card.append(this._buildHostsIndicator());
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

            if (!State.trafficDetails) {
                wrapper.append(DOM.create('button', {
                    className: 'rd-input-btn', textContent: 'Load Traffic Details', style: 'width:100%; margin-bottom:12px;',
                    onClick: async () => {
                        const res = await API.getTrafficDetails();
                        if (res.ok) {
                            State.trafficDetails = res.data;
                            this.render();
                        } else {
                            UI.showToast('Could not load traffic details', 'error');
                        }
                    }
                }));
            } else if (State.trafficDetails && typeof State.trafficDetails === 'object') {
                const detailsSection = DOM.create('div', { style: 'margin-bottom:16px; font-size:11px; color:var(--rd-text-secondary);' });
                detailsSection.append(DOM.create('div', { style: 'font-weight:bold; margin-bottom:6px; color:var(--rd-text-primary);', textContent: 'Traffic Details' }));
                Object.entries(State.trafficDetails).slice(0, 8).forEach(([host, d]) => {
                    detailsSection.append(DOM.create('div', { textContent: host + ': ' + formatBytes(d.bytes || 0) }));
                });
                wrapper.append(detailsSection);
            }

            // --- Preferences ---
            wrapper.append(DOM.create('div', { style: 'font-size:14px; font-weight:bold; margin-bottom:8px; color:var(--rd-success);', textContent: 'Preferences' }));

            // Toggle settings
            const toggleSettings = [
                { key: 'hijack', label: 'Hijack Native Links', desc: 'Clicking host links auto-routes to RD' },
                { key: 'autoShow', label: 'Auto-Show Dashboard' },
                { key: 'rememberLastTab', label: 'Remember Last Tab' },
                { key: 'rememberDashboardOpen', label: 'Remember Dashboard Open', desc: 'Restore dashboard open/closed state across page loads' },
                { key: 'switchToTorrentsOnMagnet', label: 'Switch to Torrents on Magnet', desc: 'Open Torrents tab after a magnet is added successfully' },
                { key: 'openDashboardOnMagnet', label: 'Open Dashboard on Page Magnet', desc: 'Show dashboard when adding a magnet via the inline page icon' },
                { key: 'autoCleanup', label: 'Auto-Clean Dead Torrents' },
                { key: 'smartFilter', label: 'Smart Extension Filter' },
                { key: 'notificationSound', label: 'Notification Sound' },
                { key: 'notifyOnQueueComplete', label: 'Notify on Queue Complete' },
                { key: 'deepScan', label: 'Deep Scan (iframes)', desc: 'Scan links inside iframes — slower' },
                { key: 'dedupeHistory', label: 'Dedupe Link History', desc: 'Replace older entries when the same download URL is added again' },
                { key: 'useUnrestrictCache', label: 'Cache Unrestrict Results', desc: 'Skip API calls for host links already unrestricted this session' },
                { key: 'useApiHostRegex', label: 'Use API Host Regex', desc: 'Use Real-Debrid /hosts/regex for link detection (fallback to built-in list)' }
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
            wrapper.append(this._buildSelectRow('Torrent Refresh Interval', 'torrentPollInterval', [
                ['3', '3 seconds'], ['4', '4 seconds'], ['6', '6 seconds'], ['10', '10 seconds'], ['15', '15 seconds'], ['30', '30 seconds']
            ], () => {
                if (State.currentTab === Config.TAB_KEYS.TORRENTS && Tabs.Torrents) Tabs.Torrents.startPolling();
            }));
            wrapper.append(this._buildSelectRow('Queue Concurrency', 'queueConcurrency', [
                ['1', '1 (safest)'], ['2', '2'], ['3', '3 (default)'], ['5', '5'], ['8', '8 (fastest)']
            ]));
            wrapper.append(this._buildSelectRow('Cloud History Limit', 'cloudLimit', [
                ['50', '50 items'], ['100', '100 items'], ['250', '250 items'], ['500', '500 items']
            ], () => {
                if (State.currentTab === Config.TAB_KEYS.CLOUD && Tabs.Cloud) Tabs.Cloud.render();
            }));
            wrapper.append(this._buildSelectRow('API Rate Limit', 'apiRateLimit', [
                ['2', '2 req/s'], ['4', '4 req/s (default)'], ['6', '6 req/s'], ['8', '8 req/s']
            ]));
            wrapper.append(this._buildSelectRow('Max Links Per Scan', 'maxLinksPerScan', [
                ['50', '50'], ['150', '150 (default)'], ['300', '300'], ['500', '500']
            ]));

            // Text inputs
            wrapper.append(this._buildTextRow('Dashboard Toggle Shortcut', 'toggleShortcut', State.settings.toggleShortcut));
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
            wrapper.append(DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Clear Session Caches', style: 'width:100%; margin-top:8px;',
                onClick: () => {
                    State.unrestrictCache.clear();
                    State.linkCheckCache.clear();
                    State.pageLinkCache.clear();
                    UI.showToast('Session caches cleared');
                }
            }));

            // Logout
            wrapper.append(DOM.create('button', {
                className: 'rd-action-btn', textContent: 'Log Out',
                style: 'background:var(--rd-danger); color:var(--rd-bg-base); padding:10px; width:100%; font-size:13px; font-weight:bold; margin-top:24px;',
                onClick: () => { if (confirm('Logout?')) { Config.clearKey(); location.reload(); } }
            }));

            area.append(wrapper);
        },

        _getHostsIndicatorText() {
            const n = State.dynamicHosts?.length || 0;
            let text = 'Hosts: ' + n + ' supported';
            if (State.hostsUpdatedAt) text += ' · updated ' + formatRelativeTime(State.hostsUpdatedAt);
            if (State.hostsFetchFailed) text += ' · refresh failed';
            return text;
        },

        _buildHostsIndicator() {
            return DOM.create('div', {
                id: 'rd-hosts-indicator',
                className: 'rd-account-row',
                style: 'padding:6px 0 0; border:none; font-size:11px; color:' + (State.hostsFetchFailed ? 'var(--rd-warning)' : 'var(--rd-text-secondary)') + ';',
                textContent: this._getHostsIndicatorText()
            });
        },

        _updateHostsIndicator() {
            const el = document.getElementById('rd-hosts-indicator');
            if (!el) return;
            el.textContent = this._getHostsIndicatorText();
            el.style.color = State.hostsFetchFailed ? 'var(--rd-warning)' : 'var(--rd-text-secondary)';
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

        _buildSelectRow(label, key, options, onChange) {
            const row = DOM.create('div', { className: 'rd-account-row', style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--rd-glass-border); font-size:12px;' });
            row.append(DOM.create('span', { textContent: label }));
            const select = DOM.create('select', { className: 'rd-select' });
            for (const [val, text] of options) {
                const opt = DOM.create('option', { value: val, textContent: text });
                if (String(State.settings[key]) === val) opt.selected = true;
                select.append(opt);
            }
            select.addEventListener('change', () => {
                State.settings[key] = select.value;
                saveSettings();
                UI.showToast(label + ' Updated');
                if (onChange) onChange();
            });
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
            const includeKey = confirm('Include API key in backup?\n\nOK = include key\nCancel = settings only');
            const data = { settings: State.settings };
            if (includeKey) data.apiKey = State.apiKey;
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
    _pageRefreshTimer: null,
    _observer: null,
    _linksScannedThisPass: 0,
    _HOST_RE: /^(?:https?|magnet):\/\/([^/]+)/i,

    // Releases the MutationObserver. Currently a no-op at runtime (Tampermonkey
    // owns the page lifecycle), but exposed for future HMR / SPA-unmount paths.
    destroy() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this._scanTimer) { clearTimeout(this._scanTimer); this._scanTimer = null; }
    },

    init() {
        if (!State.apiKey) return;

        // Fetch hosts (parallel — independent calls, no data dependency)
        const useApiRegex = State.settings.useApiHostRegex;
        Promise.all([
            API.get('/hosts/domains').then(({ ok, data }) => {
                if (ok && Array.isArray(data)) {
                    State.dynamicHosts = data;
                    State.hostsUpdatedAt = Date.now();
                    State.hostsFetchFailed = false;
                    GM_setValue('rd_dynamic_hosts', JSON.stringify(data));
                    GM_setValue('rd_hosts_updated_at', String(State.hostsUpdatedAt));
                    Config.hostRegex = Config.getActiveRegex();
                } else {
                    State.hostsFetchFailed = true;
                }
                if (Tabs.Settings && Tabs.Settings._updateHostsIndicator) Tabs.Settings._updateHostsIndicator();
            }),
            API.get('/hosts/status').then(({ ok, data }) => {
                if (ok && data) State.liveHosts = data;
            }),
            useApiRegex ? API.getHostsRegex().then(({ ok, data }) => {
                if (ok && data && data.regex) {
                    State.apiHostRegex = data.regex;
                    Config.hostRegex = Config.getActiveRegex();
                }
            }) : Promise.resolve(),
            useApiRegex ? API.getHostsRegexFolder().then(({ ok, data }) => {
                if (ok && data && data.regex) State.apiHostRegexFolder = data.regex;
            }) : Promise.resolve()
        ]).catch(() => { /* individual failures already handled above */ });

        // MutationObserver — page-lifetime observer. Single registration in init(),
        // paired with destroy() for symmetry. Currently never destroyed (Tampermonkey
        // owns the page lifecycle), but the ref is kept so a future HMR / SPA
        // route-switch path can disconnect without re-grepping — see HER-117.
        this._observer = new MutationObserver(() => {
            if (document.hidden) return;
            clearTimeout(this._scanTimer);
            this._scanTimer = setTimeout(() => this.scanPage(), 300);
        });
        if (document.body) {
            this._observer.observe(document.body, { childList: true, subtree: true });
        }

        // SPA navigation detection — history monkey-patch can throw on
        // restricted / opaque origins; fall back to polling alone.
        State.lastUrl = location.href;
        const onNav = () => {
            if (location.href === State.lastUrl) return;
            State.lastUrl = location.href;
            State.scannedLinksMap.clear();
            State.processedUrls.clear();
            State.pageCollapsedDomains.clear();
            document.querySelectorAll('.rd-inline-icon').forEach(el => el.remove());
            document.querySelectorAll('.rd-processed').forEach(el => el.classList.remove('rd-processed'));
            UI.updateBadge(0);
            this.scanPage();
        };
        window.addEventListener('popstate', onNav);
        window.addEventListener('hashchange', onNav);
        try {
            const origPush = history.pushState;
            const origReplace = history.replaceState;
            history.pushState = function() { origPush.apply(this, arguments); onNav(); };
            history.replaceState = function() { origReplace.apply(this, arguments); onNav(); };
        } catch (e) {
            console.warn('[RD Suite] SPA history hooks unavailable:', e);
        }
        setInterval(onNav, 2000);

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
        const maxPerPass = Math.max(20, parseInt(State.settings.maxLinksPerScan, 10) || 150);
        this._linksScannedThisPass = 0;
        const links = doc.querySelectorAll('a:not(.rd-processed)');
        for (let i = 0; i < links.length; i++) {
            if (this._linksScannedThisPass >= maxPerPass) break;
            const link = links[i];
            this._linksScannedThisPass++;
            let url = link.href;
            let text = (link.innerText || '').trim() || url;
            if (!url) continue;

            if (url.startsWith('magnet:')) {
                link.classList.add('rd-processed');
                const icon = this.injectIcon(link, '\u{1F9F2}', () => {
                    if (State.settings.openDashboardOnMagnet) UI.toggleDashboard(true);
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
                const hostMatch = url.match(Scanner._HOST_RE);
                if (!hostMatch) continue;
                const hostDomain = hostMatch[1].replace(/^www\./, '');
                const hostObj = Object.values(State.liveHosts).find(h => hostDomain.includes(h.id) || hostDomain.includes((h.name || '').toLowerCase()));
                const isDown = hostObj && hostObj.status === 'down';

                if (isDown) {
                    this.injectIcon(link, '\u274C', () => UI.showToast((hostObj.name || hostDomain) + ' is offline', 'error'), url, 'error');
                } else {
                    const icon = this.injectIcon(link, '\u26A1', () => {
                        UI.openTab('links', () => unrestrictLinkOrFolder(url));
                    }, url);
                    // X-ray tooltip on hover
                    this._setupXray(icon, url);
                    // Hijack
                    if (State.settings.hijack) {
                        link.addEventListener('click', (e) => {
                            if (!e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                                UI.openTab('links', () => unrestrictLinkOrFolder(url));
                            }
                        });
                    }
                    if (!State.scannedLinksMap.has(url)) {
                        State.scannedLinksMap.set(url, { type: 'host', text: text.substring(0, 45) });
                    }
                }
                newFound = true;
            }
        }
        if (newFound) {
            UI.updateBadge(State.scannedLinksMap.size);
            if (State.currentTab === 'page' && State.isExpanded) {
                clearTimeout(this._pageRefreshTimer);
                this._pageRefreshTimer = setTimeout(() => Tabs.Page.refresh(), 400);
            }
        }
    },

    injectIcon(target, text, handler, linkUrl, extraClass = '') {
        const icon = DOM.create('span', {
            className: 'rd-inline-icon ' + extraClass,
            textContent: text,
            dataset: { linkUrl: linkUrl || '' },
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

        if (State.isMobile && extraClass !== 'error' && linkUrl) {
            addMobileLongPress(icon, [{
                label: 'File info',
                action: async () => {
                    if (linkUrl.startsWith('magnet:')) {
                        UI.showToast(icon.dataset.cache || 'Checking cache...');
                        return;
                    }
                    let info = State.linkCheckCache.get(linkUrl);
                    if (!info) {
                        const { ok, data } = await API.post('/unrestrict/check', { link: linkUrl });
                        if (ok && data && data.supported) {
                            info = data.filename + ' \u2014 ' + (data.filesize ? formatBytes(data.filesize) : 'Unknown');
                            State.linkCheckCache.set(linkUrl, info);
                            State.pageLinkCache.set(linkUrl, 'cached');
                        } else {
                            info = 'Unsupported or uncached';
                            State.pageLinkCache.set(linkUrl, 'uncached');
                        }
                    }
                    UI.showModal('Link Info', [DOM.create('div', { textContent: info, style: 'font-size:13px;' })], []);
                }
            }]);
        }

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
        State.magnetCacheQueue.push({ hash, el: iconElement, magnet: magnetLink });

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
                const magnetUrl = item.magnet || item.el.dataset.linkUrl || '';
                if (hostData && hostData.rd && hostData.rd.length > 0) {
                    item.el.classList.add('cached');
                    item.el.textContent = '\u{1F7E2} \u{1F9F2}';
                    item.el.dataset.cache = 'Cached';
                    if (magnetUrl) State.pageLinkCache.set(magnetUrl, 'cached');
                } else {
                    item.el.classList.add('uncached');
                    item.el.textContent = '\u{1F7E1} \u{1F9F2}';
                    item.el.dataset.cache = 'Uncached';
                    if (magnetUrl) State.pageLinkCache.set(magnetUrl, 'uncached');
                }
            });
        }, 500);
    },

    _setupXray(icon, url) {
        let timer;
        icon.addEventListener('mouseenter', () => {
            if (icon.dataset.xray) return this._showTooltip(icon, icon.dataset.xray);
            if (State.linkCheckCache.has(url)) {
                icon.dataset.xray = State.linkCheckCache.get(url);
                return this._showTooltip(icon, icon.dataset.xray);
            }
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
                State.linkCheckCache.set(url, icon.dataset.xray);
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
        let selTimer;
        document.addEventListener('selectionchange', () => {
            if (!State.apiKey) return;
            clearTimeout(selTimer);
            selTimer = setTimeout(() => {
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
            }, 150);
        });

        // Click handler for selection tooltip
        document.addEventListener('click', (e) => {
            const selTooltip = document.getElementById('rd-sel-tooltip');
            if (selTooltip && e.target.closest('#rd-sel-tooltip')) {
                const content = selTooltip.dataset.content;
                if (content) {
                    UI.openTab('links', () => handleManualInput(content));
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
    _dragMoveHandler: null,
    _dragUpHandler: null,

    open(url, filename, playlist = null, mode = 'direct') {
        this.close();

        this._playlist = playlist;
        this._playlistIndex = 0;
        this._playMode = mode;

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

        const titleChildren = [
            DOM.create('span', { style: 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;', textContent: filename })
        ];
        if (mode === 'transcode') {
            titleChildren.push(DOM.create('span', {
                textContent: 'Transcode',
                style: 'font-size:9px;background:var(--rd-warning);color:var(--rd-bg-base);padding:2px 6px;border-radius:6px;margin-left:6px;'
            }));
        }
        const header = DOM.create('div', { id: 'rd-media-drag-handle' }, [
            DOM.create('div', { style: 'display:flex;align-items:center;flex:1;min-width:0;' }, titleChildren),
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
                DOM.create('div', { textContent: 'Format not natively supported in browser.' }),
                DOM.create('button', {
                    className: 'rd-input-btn primary',
                    textContent: 'Open in External Player',
                    style: 'margin-top:12px;',
                    onClick: () => window.open(getStreamUrl(url), '_self')
                }),
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
        // Remove drag handlers (avoid listener leak across media sessions)
        if (this._dragMoveHandler) { document.removeEventListener('mousemove', this._dragMoveHandler); this._dragMoveHandler = null; }
        if (this._dragUpHandler) { document.removeEventListener('mouseup', this._dragUpHandler); this._dragUpHandler = null; }
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
        this._dragMoveHandler = (e) => {
            if (isDragging && !win.classList.contains('rd-fullscreen')) {
                win.style.left = (e.clientX - startX) + 'px';
                win.style.top = (e.clientY - startY) + 'px';
                win.style.bottom = 'auto';
                win.style.right = 'auto';
            }
        };
        this._dragUpHandler = () => { isDragging = false; document.body.style.userSelect = ''; };
        document.addEventListener('mousemove', this._dragMoveHandler);
        document.addEventListener('mouseup', this._dragUpHandler);

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

})();
