import { AppConfig, LocalVideo, VideoAnalysis, VideoTag } from '../types';
import { transcriptText } from './analysisUtils';

export interface VideoQueryOptions {
  searchTerm: string;
  sortMode?: AppConfig['defaultSort'];
  viewState: 'all' | 'history' | 'liked' | 'channel';
  selectedChannel?: string;
  history: string[];
  likedVideoIds: string[];
}

export const queryVideos = (
  videos: LocalVideo[],
  videoTags: Record<string, VideoTag[]>,
  videoAnalyses: Record<string, VideoAnalysis>,
  options: VideoQueryOptions
): LocalVideo[] => {
  const query = options.searchTerm.trim().toLowerCase();
  let filtered = query
    ? videos.filter(video =>
      video.title.toLowerCase().includes(query)
      || video.file.name.toLowerCase().includes(query)
      || video.channelName.toLowerCase().includes(query)
      || (videoTags[video.id] || []).some(tag => tag.tag.toLowerCase().includes(query))
      || transcriptText(videoAnalyses[video.id]?.transcript || []).toLowerCase().includes(query)
    )
    : [...videos];

  if (options.viewState === 'history') {
    const videosById = new Map(videos.map(video => [video.id, video]));
    return options.history
      .map(id => videosById.get(id))
      .filter((video): video is LocalVideo => !!video);
  }

  const sortMode = options.sortMode || 'date';
  filtered.sort((a, b) => {
    if (sortMode === 'name') return a.title.localeCompare(b.title);
    if (sortMode === 'size') return b.size - a.size;
    return b.lastModified - a.lastModified;
  });

  if (options.viewState === 'liked') return filtered.filter(video => options.likedVideoIds.includes(video.id));
  if (options.viewState === 'channel') return filtered.filter(video => video.channelName === options.selectedChannel);
  return filtered;
};
