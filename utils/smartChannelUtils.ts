import { AppConfig, LocalVideo, SmartChannel, VideoTag } from '../types';

export const videoMatchesSmartChannel = (
  video: LocalVideo,
  channel: SmartChannel,
  config: AppConfig,
  tags: VideoTag[]
): boolean => {
  const progress = config.watchProgress[video.id] || 0;
  const rules = channel.rules.map(rule => {
    const value = String(rule.value).toLowerCase();
    switch (rule.field) {
      case 'tag':
        return tags.some(tag => tag.accepted && tag.tag.toLowerCase().includes(value));
      case 'title':
        return video.title.toLowerCase().includes(value);
      case 'folder':
        return video.channelName.toLowerCase().includes(value);
      case 'duration':
        return rule.operator === 'greaterThan'
          ? video.duration > Number(rule.value)
          : video.duration < Number(rule.value);
      case 'watched':
        return (progress / Math.max(video.duration, 1) >= 0.9) === Boolean(rule.value);
      case 'liked':
        return config.likedVideoIds.includes(video.id) === Boolean(rule.value);
      default:
        return false;
    }
  });
  return channel.matchMode === 'any' ? rules.some(Boolean) : rules.every(Boolean);
};
