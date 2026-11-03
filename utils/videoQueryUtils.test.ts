import { describe, expect, it } from 'vitest';
import { LocalVideo } from '../types';
import { queryVideos } from './videoQueryUtils';

const video = (id: string, title: string, modified: number): LocalVideo => ({
  id,
  file: new File([], `${id}.mp4`),
  title,
  channelName: 'Library',
  url: `blob:${id}`,
  thumbnailUrl: null,
  duration: 10,
  size: modified,
  lastModified: modified
});

describe('video query utilities', () => {
  it('searches transcript and metadata without mutating the source array', () => {
    const videos = [video('old', 'Old video', 1), video('new', 'New video', 2)];
    const result = queryVideos(videos, {}, {
      old: {
        videoId: 'old',
        analysisVersion: 1,
        status: 'complete',
        language: 'en',
        summary: null,
        analyzedAt: 1,
        error: null,
        transcript: [{ start: 0, end: 1, text: 'Offline indexing', confidence: 1 }],
        modelId: 'test',
        chapters: []
      }
    }, {
      searchTerm: 'indexing',
      viewState: 'all',
      history: [],
      likedVideoIds: []
    });

    expect(result.map(item => item.id)).toEqual(['old']);
    expect(videos.map(item => item.id)).toEqual(['old', 'new']);
  });

  it('preserves explicit history ordering', () => {
    const videos = [video('first', 'First', 1), video('second', 'Second', 2)];
    const result = queryVideos(videos, {}, {}, {
      searchTerm: '',
      viewState: 'history',
      history: ['second', 'first'],
      likedVideoIds: []
    });

    expect(result.map(item => item.id)).toEqual(['second', 'first']);
  });

  it('keeps a large local search within the performance budget', () => {
    const videos = Array.from({ length: 5000 }, (_, index) =>
      video(`video-${index}`, index === 4999 ? 'Target lesson' : `Lesson ${index}`, index)
    );
    const startedAt = performance.now();
    const result = queryVideos(videos, {}, {}, {
      searchTerm: 'target lesson',
      viewState: 'all',
      history: [],
      likedVideoIds: []
    });

    expect(result).toHaveLength(1);
    expect(performance.now() - startedAt).toBeLessThan(500);
  });
});
