import React from 'react';
import { ListVideo, Plus, Trash2 } from 'lucide-react';
import { LocalVideo, Playlist } from '../types';
import { formatTimeAgo } from '../utils/videoUtils';

interface PlaylistsViewProps {
  playlists: Playlist[];
  videos: LocalVideo[];
  onCreatePlaylist: () => void;
  onDeletePlaylist: (playlistId: string) => void;
  onVideoSelect: (video: LocalVideo) => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  playlists,
  videos,
  onCreatePlaylist,
  onDeletePlaylist,
  onVideoSelect
}) => {
  const videosById = new Map(videos.map(video => [video.id, video]));

  return (
    <section className="p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Playlists</h1>
          <p className="mt-2 text-sm text-gray-400">Organize videos into your own offline collections.</p>
        </div>
        <button
          type="button"
          onClick={onCreatePlaylist}
          className="flex items-center gap-2 rounded-full bg-[var(--yt-brand)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> New playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <ListVideo className="mx-auto h-12 w-12 text-gray-500" />
          <p className="mt-4 text-gray-300">No playlists yet.</p>
          <p className="mt-1 text-sm text-gray-500">Create one from here or while watching a video.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {playlists.map(playlist => {
            const playlistVideos = playlist.videoIds
              .map(id => videosById.get(id))
              .filter((video): video is LocalVideo => !!video);
            return (
              <article key={playlist.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-white">{playlist.name}</h2>
                    <p className="text-xs text-gray-500">
                      {playlistVideos.length} videos · updated {formatTimeAgo(playlist.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeletePlaylist(playlist.id)}
                    className="rounded-full p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400"
                    title={`Delete ${playlist.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {playlistVideos.slice(0, 6).map(video => (
                    <button
                      type="button"
                      key={video.id}
                      onClick={() => onVideoSelect(video)}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/10"
                    >
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded bg-black/40">
                          <ListVideo className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <span className="line-clamp-2 text-sm text-gray-200">{video.title}</span>
                    </button>
                  ))}
                  {playlistVideos.length === 0 && (
                    <p className="p-4 text-sm text-gray-500">This playlist is empty.</p>
                  )}
                  {playlistVideos.length > 6 && (
                    <p className="p-3 text-center text-xs text-gray-500">and {playlistVideos.length - 6} more</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
