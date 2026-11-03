import { TranscriptSegment, VideoChapter } from '../types';

const parseTimestamp = (value: string): number => {
  const normalized = value.replace(',', '.').trim();
  const parts = normalized.split(':').map(Number);
  if (parts.some(part => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
};

export const parseSubtitleText = (content: string): TranscriptSegment[] => {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  const segments: TranscriptSegment[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const timing = lines[index].match(/(\d{1,2}:\d{2}(?::\d{2})?[,.]\d{1,3})\s+-->\s+(\d{1,2}:\d{2}(?::\d{2})?[,.]\d{1,3})/);
    if (!timing) continue;
    const text: string[] = [];
    index += 1;
    while (index < lines.length && lines[index].trim() !== '') {
      if (!/^(WEBVTT|STYLE|NOTE|\d+$)/.test(lines[index].trim())) text.push(lines[index].trim());
      index += 1;
    }
    const joined = text.join(' ').replace(/<[^>]+>/g, '').trim();
    if (joined) {
      segments.push({
        start: parseTimestamp(timing[1]),
        end: parseTimestamp(timing[2]),
        text: joined,
        confidence: 1
      });
    }
  }
  return segments;
};

export const subtitleFileNameFor = (videoName: string): string[] => {
  const base = videoName.replace(/\.[^.]+$/, '');
  return [`${base}.vtt`, `${base}.srt`, `${base}.en.vtt`, `${base}.en.srt`];
};

export const chaptersFromSubtitle = (segments: TranscriptSegment[], duration: number): VideoChapter[] => {
  const candidates = segments.filter(segment => segment.start >= 0 && segment.start < duration && segment.text.trim());
  if (candidates.length < 2) return [];
  return candidates
    .filter((segment, index) => index === 0 || segment.start - candidates[index - 1].start >= 30)
    .map((segment, index, chapters) => ({
      id: `subtitle-${segment.start}`,
      start: segment.start,
      end: chapters[index + 1]?.start || duration,
      title: segment.text.split(/\s+/).slice(0, 8).join(' ').replace(/[.!?,;:]+$/, ''),
      source: 'subtitle' as const,
      confidence: segment.confidence,
      modelId: null
    }));
};
