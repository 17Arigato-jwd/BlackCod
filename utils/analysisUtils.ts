import { AnalysisJob, TranscriptSegment, VideoAnalysis, VideoChapter } from '../types';

export const createPendingAnalysis = (videoId: string): VideoAnalysis => ({
  videoId,
  analysisVersion: 1,
  status: 'pending',
  language: null,
  summary: null,
  analyzedAt: null,
  error: null,
  transcript: [],
  modelId: null,
  chapters: []
});

export const chaptersFromTranscript = (segments: TranscriptSegment[], duration: number): VideoChapter[] => {
  if (segments.length < 2) return [];
  const chapters: VideoChapter[] = [];
  const segmentSize = 12;
  for (let index = 0; index < segments.length; index += segmentSize) {
    const first = segments[index];
    const next = segments[index + segmentSize];
    const end = Math.min(next?.start || duration, duration);
    if (end - first.start < 15) continue;
    const words = segments.slice(index, index + segmentSize).map(segment => segment.text.trim()).join(' ');
    const title = words.split(/\s+/).slice(0, 7).join(' ').replace(/[.!?,;:]+$/, '') || `Chapter ${chapters.length + 1}`;
    chapters.push({
      id: `${first.start}-${end}`,
      start: first.start,
      end,
      title,
      source: 'transcript',
      confidence: segments.slice(index, index + segmentSize).reduce((sum, segment) => sum + segment.confidence, 0) / Math.min(segmentSize, segments.length - index),
      modelId: null
    });
  }
  return chapters;
};

export const sortAnalysisJobs = (jobs: AnalysisJob[]): AnalysisJob[] =>
  [...jobs].sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);

export const transcriptText = (segments: TranscriptSegment[]): string =>
  segments.map(segment => segment.text.trim()).filter(Boolean).join(' ');

export const findTranscriptMatches = (segments: TranscriptSegment[], query: string): TranscriptSegment[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return segments.filter(segment => segment.text.toLowerCase().includes(normalized));
};
