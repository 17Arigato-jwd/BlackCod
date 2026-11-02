import { AnalysisJob, TranscriptSegment, VideoAnalysis } from '../types';

export const createPendingAnalysis = (videoId: string): VideoAnalysis => ({
  videoId,
  analysisVersion: 1,
  status: 'pending',
  language: null,
  summary: null,
  analyzedAt: null,
  error: null,
  transcript: [],
  modelId: null
});

export const sortAnalysisJobs = (jobs: AnalysisJob[]): AnalysisJob[] =>
  [...jobs].sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);

export const transcriptText = (segments: TranscriptSegment[]): string =>
  segments.map(segment => segment.text.trim()).filter(Boolean).join(' ');

export const findTranscriptMatches = (segments: TranscriptSegment[], query: string): TranscriptSegment[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return segments.filter(segment => segment.text.toLowerCase().includes(normalized));
};
