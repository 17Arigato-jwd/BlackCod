
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

export type ViewState = 'home' | 'all_videos' | 'history' | 'liked' | 'library' | 'channel' | 'folders' | 'settings';

export interface Channel {
  name: string;
  videoCount: number;
}
