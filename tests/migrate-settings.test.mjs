import { describe, it, expect } from 'vitest';

const Config = {
    SETTINGS_VERSION: 2,
    defaultSettings: {
        hijack: false,
        useApiHostRegex: true,
        cloudLimit: '100'
    }
};

function migrateSettings(raw) {
    const settings = {};
    for (const key of Object.keys(Config.defaultSettings)) {
        settings[key] = raw && Object.prototype.hasOwnProperty.call(raw, key) ? raw[key] : Config.defaultSettings[key];
    }
    return settings;
}

describe('migrateSettings', () => {
    it('applies defaults for missing keys', () => {
        const result = migrateSettings({ hijack: true });
        expect(result.hijack).toBe(true);
        expect(result.useApiHostRegex).toBe(true);
        expect(result.cloudLimit).toBe('100');
    });

    it('preserves saved values', () => {
        const result = migrateSettings({ cloudLimit: '250', useApiHostRegex: false });
        expect(result.cloudLimit).toBe('250');
        expect(result.useApiHostRegex).toBe(false);
    });

    it('handles empty input', () => {
        const result = migrateSettings({});
        expect(result.hijack).toBe(false);
    });
});

describe('page scanner settings defaults (41.5+)', () => {
    const fullDefaults = {
        hostPageDownloadButton: true,
        inlinePageIcons: true,
        blockInvalidDownloads: true,
    };

    function migrateWithDefaults(raw, defaultSettings) {
        const settings = {};
        for (const key of Object.keys(defaultSettings)) {
            settings[key] = raw && Object.prototype.hasOwnProperty.call(raw, key) ? raw[key] : defaultSettings[key];
        }
        return settings;
    }

    it('defaults host page download button and inline icons to on', () => {
        const result = migrateWithDefaults({}, fullDefaults);
        expect(result.hostPageDownloadButton).toBe(true);
        expect(result.inlinePageIcons).toBe(true);
        expect(result.blockInvalidDownloads).toBe(true);
    });

    it('preserves explicit off values', () => {
        const result = migrateWithDefaults({
            hostPageDownloadButton: false,
            inlinePageIcons: false,
            blockInvalidDownloads: false
        }, fullDefaults);
        expect(result.hostPageDownloadButton).toBe(false);
        expect(result.inlinePageIcons).toBe(false);
        expect(result.blockInvalidDownloads).toBe(false);
    });
});
