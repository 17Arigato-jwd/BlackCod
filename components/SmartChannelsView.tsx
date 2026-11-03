import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { AppConfig, LocalVideo, SmartChannel, VideoTag } from '../types';
import { explainSmartChannelMatch } from '../utils/smartChannelUtils';
import { VideoAnalysis } from '../types';

interface SmartChannelsViewProps {
  channels: SmartChannel[];
  videos: LocalVideo[];
  config: AppConfig;
  tags: Record<string, VideoTag[]>;
  analyses?: Record<string, VideoAnalysis>;
  onSelect: (video: LocalVideo) => void;
}

export const SmartChannelsView: React.FC<SmartChannelsViewProps> = ({ channels, videos, config, tags, analyses = {}, onSelect }) => (
  <section className="p-6 lg:p-10">
    <div className="mb-8 flex items-center gap-3">
      <BrainCircuit className="h-8 w-8 text-[var(--yt-brand)]" />
      <div>
        <h1 className="text-3xl font-bold text-white">Smart Channels</h1>
        <p className="mt-1 text-sm text-gray-400">Local rule-based channels built from your library.</p>
      </div>
    </div>
    <div className="grid gap-6 md:grid-cols-2">
      {channels.map(channel => {
        const matches = videos.map(video => ({
          video,
          match: explainSmartChannelMatch(video, channel, config, tags[video.id] || [], analyses[video.id])
        })).filter(item => item.match.matches);
        return (
          <article key={channel.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-semibold text-white">{channel.name}</h2>
            <p className="mt-1 text-xs text-gray-500">{matches.length} matching videos</p>
            <div className="mt-4 space-y-2">
              {matches.slice(0, 5).map(({ video, match }) => (
                <button key={video.id} type="button" onClick={() => onSelect(video)} title={match.reasons.join(', ')} className="block w-full truncate rounded-lg bg-black/20 p-2 text-left text-sm text-gray-200 hover:bg-white/10">
                  {video.title}<span className="ml-2 text-xs text-gray-500">({match.reasons.join(', ')})</span>
                </button>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  </section>
);
