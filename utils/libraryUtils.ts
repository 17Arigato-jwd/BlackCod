import { AppConfig, LocalVideo, VideoIndexRecord } from '../types';
import { extractMetadata, getVideoId } from './videoUtils';
import { getCustomThumbnail } from './storageUtils';

export const getLibraryRelativePath = (file: File): string =>
  file.webkitRelativePath || file.name;

export const getDefaultChannelName = (file: File, fallback: string): string => {
  if (!file.webkitRelativePath) return fallback;
  const parts = file.webkitRelativePath.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : fallback;
};

export const createLocalVideo = async (
  file: File,
  config: AppConfig,
  sourceName: string,
  forceChannelName?: string
): Promise<LocalVideo | null> => {
  const id = getVideoId(file, sourceName);
  if (config.hiddenVideoIds.includes(id)) return null;

  const channelName = config.videoChannelOverrides?.[id]
    || forceChannelName
    || getDefaultChannelName(file, 'Uncategorized');
  const customThumbnail = await getCustomThumbnail(id);
  const metadata = await extractMetadata(file);

  return {
    id,
    file,
    title: config.customVideoTitles[id] || file.name.replace(/\.[^/.]+$/, ''),
    channelName,
    url: URL.createObjectURL(file),
    thumbnailUrl: customThumbnail || metadata.thumbnailUrl,
    duration: metadata.duration,
    size: file.size,
    lastModified: file.lastModified
  };
};

export const toVideoIndexRecord = (
  video: LocalVideo,
  libraryId: string
): VideoIndexRecord => ({
  id: video.id,
  libraryId,
  path: getLibraryRelativePath(video.file),
  size: video.size,
  modifiedTime: video.lastModified,
  duration: video.duration,
  title: video.title,
  status: 'ready',
  indexedAt: Date.now()
});
