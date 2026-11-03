import { AnalysisJob, AnalysisResourceBudget, TranscriptSegment, VideoAnalysis } from '../types';
import { createPendingAnalysis } from './analysisUtils';

export interface TranscriptionRequest {
  job: AnalysisJob;
  media?: Blob;
  resourceBudget: AnalysisResourceBudget;
  onProgress?: (progress: number) => void;
}

export interface TranscriptionResult {
  language: string | null;
  transcript: TranscriptSegment[];
  summary?: string | null;
}

export interface TranscriptionAdapter {
  readonly id: string;
  readonly version: string;
  transcribe(request: TranscriptionRequest, signal: AbortSignal): Promise<TranscriptionResult>;
}

export type MediaResolver = (job: AnalysisJob) => Promise<Blob | undefined>;

const DEFAULT_RESOURCE_BUDGET: AnalysisResourceBudget = {
  maxDurationMs: 30 * 60 * 1000,
  maxMemoryMb: 1024,
  maxThreads: 2
};

export const createTranscriptionProvider = (
  adapter: TranscriptionAdapter,
  resolveMedia: MediaResolver,
  resourceBudget: AnalysisResourceBudget = DEFAULT_RESOURCE_BUDGET
) => async (job: AnalysisJob, signal: AbortSignal): Promise<{ analysis: VideoAnalysis }> => {
  const media = await resolveMedia(job);
  if (!media) throw new Error(`No media source is available for transcription job ${job.id}.`);
  const result = await adapter.transcribe({ job, media, resourceBudget }, signal);
  const analysis = createPendingAnalysis(job.videoId);
  analysis.status = 'complete';
  analysis.language = result.language;
  analysis.summary = result.summary ?? null;
  analysis.transcript = result.transcript;
  analysis.modelId = adapter.id;
  analysis.analyzedAt = Date.now();
  return { analysis };
};

export const createUnavailableTranscriptionAdapter = (reason: string): TranscriptionAdapter => ({
  id: 'unavailable',
  version: '1',
  async transcribe(_request, signal) {
    if (signal.aborted) throw new DOMException('Transcription cancelled.', 'AbortError');
    throw new Error(reason);
  }
});
