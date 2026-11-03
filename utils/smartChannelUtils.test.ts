import { describe, expect, it } from 'vitest';
import { AppConfig, LocalVideo, SmartChannel, VideoAnalysis } from '../types';
import { explainSmartChannelMatch } from './smartChannelUtils';

const config: AppConfig = {
  likedVideoIds: ['liked'],
  history: [],
  watchProgress: {},
  ratings: { liked: 5 },
  hiddenVideoIds: [],
  customVideoTitles: {},
  customCategories: [],
  videoChannelOverrides: {}
};

const video: LocalVideo = {
  id: 'liked',
  file: new File([], 'lesson.mp4'),
  title: 'Offline lesson',
  channelName: 'Courses',
  url: 'blob:test',
  thumbnailUrl: null,
  duration: 120,
  size: 0,
  lastModified: 0
};

const analysis: VideoAnalysis = {
  videoId: video.id,
  analysisVersion: 1,
  status: 'complete',
  language: 'en',
  summary: null,
  analyzedAt: Date.now(),
  error: null,
  transcript: [{ start: 0, end: 5, text: 'Learn offline systems', confidence: 1 }],
  modelId: 'test',
  chapters: []
};

describe('smart channel matching', () => {
  it('matches metadata rules and explains successful rules', () => {
    const channel: SmartChannel = {
      id: 'learning',
      name: 'Learning',
      rules: [
        { field: 'transcript', operator: 'contains', value: 'offline' },
        { field: 'language', operator: 'equals', value: 'en' },
        { field: 'hasSubtitles', operator: 'equals', value: true },
        { field: 'rating', operator: 'greaterThan', value: 4 }
      ],
      matchMode: 'all',
      sort: 'relevance'
    };

    const result = explainSmartChannelMatch(video, channel, config, [], analysis);

    expect(result.matches).toBe(true);
    expect(result.reasons).toHaveLength(4);
  });

  it('does not treat missing subtitles as present', () => {
    const channel: SmartChannel = {
      id: 'captioned',
      name: 'Captioned',
      rules: [{ field: 'hasSubtitles', operator: 'equals', value: true }],
      matchMode: 'all',
      sort: 'recent'
    };

    expect(explainSmartChannelMatch(video, channel, config, [], {
      ...analysis,
      transcript: []
    }).matches).toBe(false);
  });
});
