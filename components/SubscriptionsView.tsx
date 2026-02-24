import React from 'react';
import { ChannelConfig, Channel } from '../types';
import { Video } from 'lucide-react';

interface SubscriptionsViewProps {
  channels: Channel[];
  channelConfigs: Record<string, ChannelConfig>;
  onToggleSubscribe: (id: string) => void;
  onNavigateChannel: (id: string) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ channels, channelConfigs, onToggleSubscribe, onNavigateChannel }) => {
  return (
    <div className="p-8 pb-20">
      <h1 className="text-2xl font-bold mb-6">All Subscriptions</h1>
      
      <div className="grid gap-4">
        {channels.map(channel => {
          const config: ChannelConfig = channelConfigs[channel.name] || { 
            id: channel.name, 
            category: 'Uncategorized', 
            isSubscribed: false 
          };
          
          return (
            <div key={channel.name} className="flex items-center justify-between bg-yt-dark p-4 rounded-xl hover:bg-[#3f3f3f] transition-colors">
              <div 
                className="flex items-center gap-4 cursor-pointer flex-1"
                onClick={() => onNavigateChannel(channel.name)}
              >
                {config.iconUrl ? (
                  <img src={config.iconUrl} alt={channel.name} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                    {channel.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">{config.displayName || channel.name}</h3>
                  <p className="text-yt-gray text-sm">{channel.videoCount} videos • {config.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => onToggleSubscribe(channel.name)}
                  className={`px-6 py-2 rounded-full font-medium text-sm transition-colors ${config.isSubscribed ? 'bg-black/30 text-yt-gray hover:text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                >
                  {config.isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>
            </div>
          );
        })}

        {channels.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            <p>No channels found in your library.</p>
          </div>
        )}
      </div>
    </div>
  );
};