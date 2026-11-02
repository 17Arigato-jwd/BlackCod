
export interface LocalVideo {
  id: string;
  file: File;
  title: string;
  channelName: string; // The folder name (default)
  url: string;
  thumbnailUrl: string | null;
  duration: number; // in seconds
  size: number;
  lastModified: number;
}

export interface VideoRecord {
  id: string;
  libraryId: string;
  path: string;
  title: string;
  duration: number | null;
  size: number;
  modifiedTime: number;
  thumbnailPath: string | null;
  channelId: string | null;
  status: 'ready' | 'missing' | 'error';
}

export interface VideoIndexRecord {
  id: string;
  libraryId: string;
  path: string;
  size: number;
  modifiedTime: number;
  duration: number | null;
  title: string;
  status: 'ready' | 'missing' | 'error';
  indexedAt: number;
}

export interface VideoMetadata {
  thumbnailUrl: string | null;
  duration: number;
}

export interface UserProfile {
  name: string;
  avatarDataUrl?: string;
}

export interface AppConfig {
  likedVideoIds: string[];
  history: string[]; // List of video IDs, limited to 20
  watchProgress: Record<string, number>; // videoId -> seconds
  ratings: Record<string, number>; // videoId -> 1-5 stars
  hiddenVideoIds: string[]; // IDs of videos removed by user
  customVideoTitles: Record<string, string>; // videoId -> Custom Display Name
  customCategories: string[]; // List of user-defined categories
  videoChannelOverrides: Record<string, string>; // videoId -> newChannelName (for custom folders)
  userProfile?: UserProfile;
  themeColor?: string; // 'default' | 'orange' | 'blue' | 'green' | 'purple' | 'pink' | 'custom'
  customThemeColor?: string; // Hex code for custom theme
  enableGradient?: boolean; // Toggle for gradient background
  
  // New Preferences
  uiDensity?: 'compact' | 'comfortable' | 'spacious';
  autoplay?: boolean;
  defaultSort?: 'date' | 'name' | 'size';

  // Persistence
  startupFolderNames?: string[]; 
}

export interface ChannelConfig {
  id: string; // usually the folder name
  displayName?: string;
  iconBlob?: Blob; // Stored in IDB
  iconUrl?: string; // Generated URL for display
  category: string;
  isSubscribed: boolean;
}

export interface UploadJob {
  id: string;
  name: string;
  current: number;
  total: number;
}

export interface VideoAnalysis {
  videoId: string;
  analysisVersion: number;
  status: 'pending' | 'running' | 'complete' | 'failed';
  language: string | null;
  summary: string | null;
  analyzedAt: number | null;
  error: string | null;
}

export interface VideoTag {
  videoId: string;
  tag: string;
  source: 'filename' | 'folder' | 'transcript' | 'vision' | 'audio' | 'user';
  confidence: number;
  accepted: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  videoIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SmartChannelRule {
  field: 'tag' | 'title' | 'duration' | 'watched' | 'liked' | 'folder';
  operator: 'contains' | 'equals' | 'greaterThan' | 'lessThan';
  value: string | number | boolean;
}

export interface SmartChannel {
  id: string;
  name: string;
  rules: SmartChannelRule[];
  matchMode: 'all' | 'any';
  sort: 'recent' | 'name' | 'relevance';
}

declare global {
  interface Window {
    blackcod?: {
      version: string;
      runtime: 'electron';
    };
  }
}

export type ViewState = 'home' | 'all_videos' | 'history' | 'liked' | 'library' | 'playlists' | 'smart_channels' | 'channel' | 'folders' | 'settings';

export interface Channel {
  name: string;
  videoCount: number;
}
