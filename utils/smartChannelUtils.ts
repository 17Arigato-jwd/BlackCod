import { AppConfig, LocalVideo, SmartChannel, VideoAnalysis, VideoTag } from '../types';

export interface SmartChannelMatch {
  matches: boolean;
  reasons: string[];
}

export const videoMatchesSmartChannel = (
  video: LocalVideo,
  channel: SmartChannel,
  config: AppConfig,
  tags: VideoTag[],
  analysis?: VideoAnalysis
): boolean => {
  return explainSmartChannelMatch(video, channel, config, tags, analysis).matches;
};

export const explainSmartChannelMatch = (
  video: LocalVideo,
  channel: SmartChannel,
  config: AppConfig,
  tags: VideoTag[],
  analysis?: VideoAnalysis
): SmartChannelMatch => {
  const progress = config.watchProgress[video.id] || 0;
  const evaluations = channel.rules.map(rule => {
    const value = String(rule.value).toLowerCase();
    let matches = false;
    let reason = '';
    switch (rule.field) {
      case 'tag':
        matches = tags.some(tag => tag.accepted && tag.tag.toLowerCase().includes(value));
        reason = `tag ${rule.operator} "${rule.value}"`;
        break;
      case 'title':
        matches = video.title.toLowerCase().includes(value);
        reason = `title contains "${rule.value}"`;
        break;
      case 'transcript':
        matches = (analysis?.transcript || []).some(segment => segment.text.toLowerCase().includes(value));
        reason = `transcript contains "${rule.value}"`;
        break;
      case 'language':
        matches = (analysis?.language || '').toLowerCase() === value;
        reason = `language is "${rule.value}"`;
        break;
      case 'hasSubtitles':
        matches = ((analysis?.transcript.length || 0) > 0) === Boolean(rule.value);
        reason = Boolean(rule.value) ? 'has subtitles' : 'has no subtitles';
        break;
      case 'folder':
        matches = video.channelName.toLowerCase().includes(value);
        reason = `folder contains "${rule.value}"`;
        break;
      case 'duration':
        matches = rule.operator === 'greaterThan'
          ? video.duration > Number(rule.value)
          : video.duration < Number(rule.value);
        reason = `duration ${rule.operator} ${rule.value}`;
        break;
      case 'watched':
        matches = (progress / Math.max(video.duration, 1) >= 0.9) === Boolean(rule.value);
        reason = Boolean(rule.value) ? 'watched' : 'unwatched';
        break;
      case 'liked':
        matches = config.likedVideoIds.includes(video.id) === Boolean(rule.value);
        reason = Boolean(rule.value) ? 'liked' : 'not liked';
        break;
      case 'rating':
        matches = rule.operator === 'greaterThan'
          ? (config.ratings[video.id] || 0) > Number(rule.value)
          : (config.ratings[video.id] || 0) < Number(rule.value);
        reason = `rating ${rule.operator} ${rule.value}`;
        break;
      default:
        reason = 'unsupported rule';
    }
    return { matches, reason };
  });
  const matches = channel.matchMode === 'any'
    ? evaluations.some(evaluation => evaluation.matches)
    : evaluations.every(evaluation => evaluation.matches);
  return {
    matches,
    reasons: evaluations.filter(evaluation => evaluation.matches).map(evaluation => evaluation.reason)
  };
};
