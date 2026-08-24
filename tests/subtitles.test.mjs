import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '..', 'src', 'modules', '08-subtitles.js'), 'utf8');

// The module has no top-level side effects, so evaluate it wholesale.
const Subtitles = new Function(src + '\nreturn Subtitles;')();

describe('Subtitles.pickSubtitleFiles', () => {
    it('selects only subtitle links, preserving order and decoding names', () => {
        const links = [
            'https://host/file/Movie.2026.mp4',
            'https://host/file/Movie%20EN.srt',
            'https://host/subs/ep1.ass?token=x',
            42,
            null,
            'magnet:?xt=urn:btih:abc'
        ];
        const subs = Subtitles.pickSubtitleFiles(links);
        expect(subs).toEqual([
            { url: 'https://host/file/Movie%20EN.srt', filename: 'Movie EN.srt' },
            { url: 'https://host/subs/ep1.ass?token=x', filename: 'ep1.ass' }
        ]);
    });

    it('tolerates non-array input', () => {
        expect(Subtitles.pickSubtitleFiles(null)).toEqual([]);
        expect(Subtitles.pickSubtitleFiles('nope')).toEqual([]);
    });
});

describe('Subtitles.guessLang', () => {
    it('maps two-letter codes', () => {
        expect(Subtitles.guessLang('movie.en.srt')).toBe('en');
        expect(Subtitles.guessLang('show.DE.VTT')).toBe('de');
    });

    it('maps legacy three-letter codes to two-letter', () => {
        expect(Subtitles.guessLang('x.eng.srt')).toBe('en');
        expect(Subtitles.guessLang('x.FRE.ass')).toBe('fr');
    });

    it('returns empty string when no language marker exists', () => {
        expect(Subtitles.guessLang('plain.srt')).toBe('');
        expect(Subtitles.guessLang(undefined)).toBe('');
    });

    it('ignores longer alphabetic runs that are not language codes', () => {
        expect(Subtitles.guessLang('movie.proper.srt')).toBe('');
    });
});

describe('Subtitles.label', () => {
    it('strips extension and language suffix', () => {
        expect(Subtitles.label('Movie.en.srt')).toBe('Movie');
        expect(Subtitles.label('episode.2.eng.ass')).toBe('episode.2');
    });
});

describe('Subtitles.srtToVtt', () => {
    it('converts SRT with ordinals, CRLF and comma milliseconds', () => {
        const srt = '1\r\n00:01:02,034 --> 00:01:05,000\r\nHello there.\r\n\r\n2\r\n0:01:06,5 --> 00:01:08,999\r\nSecond cue\r\n';
        const vtt = Subtitles.srtToVtt(srt);
        expect(vtt.startsWith('WEBVTT')).toBe(true);
        expect(vtt).toContain('00:01:02.034 --> 00:01:05.000');
        expect(vtt).toContain('0:01:06.500 --> 00:01:08.999');
        expect(vtt).toContain('Hello there.');
        expect(vtt).not.toMatch(/^\s*1\s*$/m); // ordinal lines dropped
    });

    it('returns empty string when no cues exist', () => {
        expect(Subtitles.srtToVtt('just some text\nwithout timings')).toBe('');
    });
});

describe('Subtitles.assToVtt', () => {
    const ass = [
        '[Script Info]',
        'Title: t',
        '',
        '[Events]',
        'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
        'Dialogue: 0,0:00:01.10,0:00:03.50,Default,,0,0,0,,{\\pos(1,2)}Hello\\NWorld',
        'Dialogue: 0,0:00:04.00,0:00:06.25,Default,,0,0,0,,Commas, survive, here'
    ].join('\n');

    it('converts dialogue lines, strips overrides and expands \\N breaks', () => {
        const vtt = Subtitles.assToVtt(ass);
        expect(vtt.startsWith('WEBVTT')).toBe(true);
        expect(vtt).toContain('00:00:01.100 --> 00:00:03.500');
        expect(vtt).toContain('Hello\nWorld');
        expect(vtt).not.toContain('{\\pos');
    });

    it('keeps commas inside ASS text fields', () => {
        const vtt = Subtitles.assToVtt(ass);
        expect(vtt).toContain('Commas, survive, here');
    });

    it('honours a custom Format column order', () => {
        const custom = [
            '[Events]',
            'Format: Marked, Text, End, Start',
            'Dialogue: 0,Body text,0:00:02.00,0:00:01.00'
        ].join('\n');
        const vtt = Subtitles.assToVtt(custom);
        expect(vtt).toContain('00:00:01.000 --> 00:00:02.000');
        expect(vtt).toContain('Body text');
    });

    it('returns empty string when no usable dialogue exists', () => {
        expect(Subtitles.assToVtt('[Events]\nFormat: Start, End, Text\n')).toBe('');
    });
});

describe('Subtitles.toVtt dispatch', () => {
    it('wraps bare VTT text in the WEBVTT magic when missing', () => {
        const out = Subtitles.toVtt('00:01.000 --> 00:02.000\nhi\n', 'x.vtt');
        expect(out.startsWith('WEBVTT')).toBe(true);
    });

    it('passes valid VTT through untouched', () => {
        const vtt = 'WEBVTT\n\n00:01.000 --> 00:02.000\nhi\n';
        expect(Subtitles.toVtt(vtt, 'x.vtt')).toBe(vtt);
    });

    it('routes .ssa files through the ASS converter by extension', () => {
        const ssa = '[Events]\nFormat: Start, End, Text\nDialogue: 0:00:01.00,0:00:02.00,Hey';
        expect(Subtitles.toVtt(ssa, 'x.ssa')).toContain('-->');
    });

    it('defaults unknown extensions to the SRT converter', () => {
        expect(Subtitles.toVtt('1\n00:00:01,000 --> 00:00:02,000\nA\n', 'x.sub')).toContain('WEBVTT');
    });
});
