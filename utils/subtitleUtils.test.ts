import { describe, expect, it } from 'vitest';
import { chaptersFromSubtitle, parseSubtitleText } from './subtitleUtils';

describe('subtitle utilities', () => {
  it('parses SRT timestamps and multiline cues', () => {
    const segments = parseSubtitleText(
      `1
00:00:01,000 --> 00:00:03,500
Hello
world

2
00:00:05.000 --> 00:00:06.000
Next`
    );

    expect(segments).toEqual([
      { start: 1, end: 3.5, text: 'Hello world', confidence: 1 },
      { start: 5, end: 6, text: 'Next', confidence: 1 }
    ]);
  });

  it('creates spaced subtitle chapters with bounded end times', () => {
    const chapters = chaptersFromSubtitle([
      { start: 0, end: 2, text: 'Introduction', confidence: 1 },
      { start: 35, end: 38, text: 'Main topic', confidence: 0.9 }
    ], 60);

    expect(chapters).toHaveLength(2);
    expect(chapters[0].end).toBe(35);
    expect(chapters[1].end).toBe(60);
  });
});
