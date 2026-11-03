import { AnalysisJob, VideoAnalysis } from '../types';
import {
  loadAnalysisJobs,
  saveVideoAnalysis,
  updateAnalysisJob
} from './storageUtils';
import { createPendingAnalysis, sortAnalysisJobs } from './analysisUtils';

export interface AnalysisProviderResult {
  analysis?: VideoAnalysis;
}

export type AnalysisProvider = (
  job: AnalysisJob,
  signal: AbortSignal
) => Promise<AnalysisProviderResult>;

export interface AnalysisRunnerOptions {
  provider: AnalysisProvider;
  onChange?: (job: AnalysisJob) => void;
}

export class AnalysisRunner {
  private readonly provider: AnalysisProvider;
  private readonly onChange?: (job: AnalysisJob) => void;
  private controller: AbortController | null = null;
  private running = false;

  constructor(options: AnalysisRunnerOptions) {
    this.provider = options.provider;
    this.onChange = options.onChange;
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.controller = new AbortController();
    try {
      while (!this.controller.signal.aborted) {
        const jobs = sortAnalysisJobs((await loadAnalysisJobs()).filter(job => job.status === 'queued'));
        const job = jobs[0];
        if (!job) break;
        await this.process(job, this.controller.signal);
      }
    } finally {
      this.running = false;
      this.controller = null;
    }
  }

  stop(): void {
    this.controller?.abort();
  }

  private async process(job: AnalysisJob, signal: AbortSignal): Promise<void> {
    const runningJob = await updateAnalysisJob(job.id, {
      status: 'running',
      attempts: job.attempts + 1
    });
    if (!runningJob) return;
    this.onChange?.(runningJob);
    try {
      const result = await this.provider(runningJob, signal);
      if (signal.aborted) {
        const cancelled = await updateAnalysisJob(job.id, { status: 'cancelled' });
        if (cancelled) this.onChange?.(cancelled);
        return;
      }
      if (result.analysis) await saveVideoAnalysis(result.analysis);
      const completed = await updateAnalysisJob(job.id, { status: 'complete', error: undefined });
      if (completed) this.onChange?.(completed);
    } catch (error) {
      if (signal.aborted) {
        const cancelled = await updateAnalysisJob(job.id, { status: 'cancelled' });
        if (cancelled) this.onChange?.(cancelled);
        return;
      }
      const failed = await updateAnalysisJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Analysis provider failed.'
      });
      if (failed) this.onChange?.(failed);
    }
  }
}

export const createUnavailableProvider = (reason: string): AnalysisProvider =>
  async job => {
    const analysis = createPendingAnalysis(job.videoId);
    analysis.status = 'failed';
    analysis.error = reason;
    return { analysis };
  };
