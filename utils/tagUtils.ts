import { LocalVideo, VideoTag } from '../types';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'video', 'part',
  'episode', 'final', 'copy', 'full', 'official', '1080p', '720p', '4k'
]);

const tokenize = (value: string): string[] =>
  value
    .replace(/\.[^/.]+$/, '')
    .split(/[/\\_\-.[\](){}]+/)
    .map(token => token.trim().toLowerCase())
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token))
    .filter((token, index, tokens) => tokens.indexOf(token) === index);

export const deriveLocalTags = (video: LocalVideo): VideoTag[] => {
  const filenameTags = tokenize(video.file.name);
  const pathTags = tokenize(video.file.webkitRelativePath || '');
  const tags = new Map<string, VideoTag>();

  filenameTags.forEach(tag => {
    tags.set(tag, {
      videoId: video.id,
      tag,
      source: 'filename',
      confidence: 0.8,
      accepted: true
    });
  });

  pathTags.forEach(tag => {
    if (!tags.has(tag)) {
      tags.set(tag, {
        videoId: video.id,
        tag,
        source: 'folder',
        confidence: 0.7,
        accepted: true
      });
    }
  });

  return [...tags.values()];
};
