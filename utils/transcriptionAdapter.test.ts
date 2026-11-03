import { describe, expect, it } from 'vitest';
import { AnalysisJob } from '../types';
import {
  createTranscriptionProvider,
  createUnavailableTranscriptionAdapter,
  TranscriptionAdapter,
  TranscriptionRequest
} from './transcriptionAdapter';

const job: AnalysisJob = {
  id: 'job-1',
  videoId: 'video-1',
  kind: 'transcription',
  status: 'queued',
  priority: 1,
  attempts: 0,
  createdAt: 0,
  updatedAt: 0
};

describe('transcription adapter contract', () => {
  it('passes media and resource budgets to an adapter', async () => {
    let request: TranscriptionRequest | undefined;
    const adapter: TranscriptionAdapter = {
      id: 'test-adapter',
      version: '1',
      async transcribe(nextRequest) {
        request = nextRequest;
        return {
          language: 'en',
          transcript: [{ start: 0, end: 1, text: 'Hello', confidence: 1 }]
        };
      }
    };

    const analysis = await createTranscriptionProvider(
      adapter,
      async () => new Blob(['media'], { type: 'video/mp4' }),
      { maxDurationMs: 1000, maxMemoryMb: 128, maxThreads: 1 }
    )(job, new AbortController().signal);

    expect(request?.media).toBeInstanceOf(Blob);
    expect(request?.resourceBudget.maxThreads).toBe(1);
    expect(analysis.analysis.modelId).toBe('test-adapter');
    expect(analysis.analysis.transcript).toHaveLength(1);
  });

  it('fails explicitly when no runtime is available', async () => {
    await expect(
      createUnavailableTranscriptionAdapter('Install a compatible local runtime.').transcribe(
        { job, resourceBudget: { maxDurationMs: 1, maxMemoryMb: 1, maxThreads: 1 } },
        new AbortController().signal
      )
    ).rejects.toThrow('Install a compatible local runtime.');
  });
});
