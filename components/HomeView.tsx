import React from 'react';
import { History, Sparkles } from 'lucide-react';
import { LocalVideo } from '../types';
import { VideoGrid } from './VideoGrid';

interface HomeViewProps {
  videos: LocalVideo[];
  watchProgress: Record<string, number>;
  onVideoSelect: (video: LocalVideo) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ videos, watchProgress, onVideoSelect }) => {
  const continueWatching = videos
    .filter(video => {
      const progress = watchProgress[video.id] || 0;
      return progress > 5 && progress < Math.max(video.duration - 5, 6);
    })
    .sort((a, b) => (watchProgress[b.id] || 0) - (watchProgress[a.id] || 0))
    .slice(0, 12);
  const recentlyAdded = [...videos]
    .sort((a, b) => b.lastModified - a.lastModified)
    .slice(0, 12);

  return (
    <div className="space-y-10 p-6 pb-20 lg:p-10">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-[var(--yt-brand)]" />
          <h1 className="text-xl font-bold text-white">Continue watching</h1>
        </div>
        {continueWatching.length > 0 ? (
          <VideoGrid videos={continueWatching} onVideoSelect={onVideoSelect} watchProgress={watchProgress} density="comfortable" />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">
            Start watching a video and your unfinished videos will appear here.
          </div>
        )}
      </section>
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--yt-brand)]" />
          <h2 className="text-xl font-bold text-white">Recently added</h2>
        </div>
        <VideoGrid videos={recentlyAdded} onVideoSelect={onVideoSelect} watchProgress={watchProgress} density="comfortable" />
      </section>
    </div>
  );
};
