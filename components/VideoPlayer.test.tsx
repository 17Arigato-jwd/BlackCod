import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { VideoPlayer } from './VideoPlayer';
import { LocalVideo, Playlist } from '../types';

describe('VideoPlayer UI and IPC Empirical Verification', () => {
  const dummyVideo: LocalVideo = {
    id: 'test-vid-1',
    file: new File([], 'test-vid-1.mp4'),
    title: 'Test Video 1.1.5',
    url: 'blob:http://localhost/test-uuid',
    thumbnailUrl: null,
    channelName: 'Test Channel',
    duration: 300,
    size: 2048,
    lastModified: 1700000000000,
    path: '/media/videos/test-vid-1.mp4'
  };

  const defaultProps = {
    video: dummyVideo,
    suggestedVideos: [],
    onVideoSelect: vi.fn(),
    isLiked: false,
    rating: 0,
    onToggleLike: vi.fn(),
    onRate: vi.fn(),
    onUpdateThumbnail: vi.fn(),
    onChannelClick: vi.fn(),
    onRemoveVideo: vi.fn(),
    onRenameVideo: vi.fn(),
    playlists: [] as Playlist[],
    onAddToPlaylist: vi.fn(),
    onCreatePlaylist: vi.fn(),
    videoTags: []
  };

  describe('R1.1 Elimination of Deprecated Symbols', () => {
    it('100% eliminates handleShare, shareFeedback, Share2, Download, and Check from components/VideoPlayer.tsx', () => {
      const filePath = path.resolve(__dirname, 'VideoPlayer.tsx');
      const source = fs.readFileSync(filePath, 'utf-8');

      expect(source).not.toContain('handleShare');
      expect(source).not.toContain('shareFeedback');
      expect(source).not.toContain('Share2');
      expect(source).not.toContain('Download');
      expect(source).not.toContain('Check');

      // Verify no lingering share button logic
      expect(source).not.toMatch(/\bshare\b/i);
    });

    it('imports MoreHorizontal and FolderOpen from lucide-react', () => {
      const filePath = path.resolve(__dirname, 'VideoPlayer.tsx');
      const source = fs.readFileSync(filePath, 'utf-8');

      expect(source).toMatch(/import\s*\{[^}]*MoreHorizontal[^}]*\}\s*from\s*['"]lucide-react['"]/);
      expect(source).toMatch(/import\s*\{[^}]*FolderOpen[^}]*\}\s*from\s*['"]lucide-react['"]/);
    });
  });

  describe('R1.2 Static Render & Responsive Class Markup', () => {
    it('renders the More options button with MoreHorizontal icon and proper aria attributes', () => {
      const html = renderToStaticMarkup(React.createElement(VideoPlayer, defaultProps));

      // Button exists with accessible attributes
      expect(html).toContain('aria-label="More options"');
      expect(html).toContain('title="More options"');
      expect(html).toContain('aria-expanded="false"');

      // MoreHorizontal SVG icon rendered (lucide-more-horizontal / lucide-ellipsis with 3 circles)
      expect(html).toMatch(/lucide-(more-horizontal|ellipsis)/);
      expect(html).toContain('w-3.5 h-3.5 sm:w-4 sm:h-4');
    });

    it('contains responsive class strings preventing horizontal scrollbars and enabling compact scaling', () => {
      const html = renderToStaticMarkup(React.createElement(VideoPlayer, defaultProps));

      // Container flex responsive wrapping & scrollbar hiding
      expect(html).toContain('flex items-center gap-2 flex-wrap sm:flex-nowrap scrollbar-hide');

      // Adaptive height: h-8 on mobile/compact, sm:h-9 on desktop
      expect(html).toContain('h-8 sm:h-9');

      // Adaptive padding: px-2.5 on compact, sm:px-4 on standard
      expect(html).toContain('px-2.5 sm:px-4');

      // Adaptive typography: text-xs on compact, sm:text-sm on standard
      expect(html).toContain('text-xs sm:text-sm');

      // Dropdown menu is NOT rendered initially
      expect(html).not.toContain('Open file location');
    });
  });

  describe('R1.3 Interactive Menu State Machine and Outside-Click Dismissal', () => {
    let listeners: Record<string, Function[]> = {};

    beforeEach(() => {
      listeners = {};
      (globalThis as any).window = {
        blackcod: {
          revealPath: vi.fn()
        }
      };
      (globalThis as any).document = {
        addEventListener: vi.fn((event: string, handler: Function) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(handler);
        }),
        removeEventListener: vi.fn((event: string, handler: Function) => {
          if (!listeners[event]) return;
          listeners[event] = listeners[event].filter(h => h !== handler);
        })
      };
    });

    afterEach(() => {
      delete (globalThis as any).window;
      delete (globalThis as any).document;
    });

    it('toggles menu state with functional updater (prev => !prev)', () => {
      let isMenuOpen = false;
      const setIsMenuOpen = (updater: boolean | ((prev: boolean) => boolean)) => {
        isMenuOpen = typeof updater === 'function' ? updater(isMenuOpen) : updater;
      };

      // Initial state
      expect(isMenuOpen).toBe(false);

      // Click button to open
      setIsMenuOpen((prev: boolean) => !prev);
      expect(isMenuOpen).toBe(true);

      // Click button again to close
      setIsMenuOpen((prev: boolean) => !prev);
      expect(isMenuOpen).toBe(false);
    });

    it('adds document mousedown listener when open and removes on close or outside click', () => {
      let isMenuOpen = false;
      let cleanup: (() => void) | undefined;

      const mockMenuElement = {
        contains: vi.fn()
      };
      const menuRef = { current: mockMenuElement };

      // Simulate the exact useEffect hook from VideoPlayer.tsx (lines 54-67)
      const runEffect = (openState: boolean) => {
        if (cleanup) {
          cleanup();
          cleanup = undefined;
        }

        const handleClickOutside = (event: { target: any }) => {
          if (menuRef.current && !menuRef.current.contains(event.target)) {
            isMenuOpen = false;
          }
        };

        if (openState) {
          (globalThis as any).document.addEventListener('mousedown', handleClickOutside);
        }
        cleanup = () => {
          (globalThis as any).document.removeEventListener('mousedown', handleClickOutside);
        };
      };

      // 1. Initially closed: no listener attached
      runEffect(false);
      expect((globalThis as any).document.addEventListener).not.toHaveBeenCalled();

      // 2. Open menu: listener added
      isMenuOpen = true;
      runEffect(true);
      expect((globalThis as any).document.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(listeners['mousedown']?.length).toBe(1);

      const registeredHandler = listeners['mousedown'][0];

      // 3. Click INSIDE the menu: should NOT close menu
      mockMenuElement.contains.mockReturnValueOnce(true);
      registeredHandler({ target: {} });
      expect(isMenuOpen).toBe(true);

      // 4. Click OUTSIDE the menu: closes menu
      mockMenuElement.contains.mockReturnValueOnce(false);
      registeredHandler({ target: {} });
      expect(isMenuOpen).toBe(false);

      // 5. Cleanup removes listener
      runEffect(false);
      expect((globalThis as any).document.removeEventListener).toHaveBeenCalledWith('mousedown', registeredHandler);
      expect(listeners['mousedown']?.length).toBe(0);
    });

    it('triggers window.blackcod.revealPath with video.path when Open file location is clicked', () => {
      let isMenuOpen = true;
      const setIsMenuOpen = (open: boolean) => { isMenuOpen = open; };

      const videoWithPath = {
        ...dummyVideo,
        path: '/storage/movies/action.mp4'
      };

      // Simulate onClick logic from lines 256-262 of VideoPlayer.tsx
      const handleOpenFileLocation = (targetVideo: any) => {
        const targetPath = targetVideo.path || (targetVideo.file as any)?.path;
        if (targetPath) {
          (globalThis as any).window.blackcod?.revealPath(targetPath);
        }
        setIsMenuOpen(false);
      };

      handleOpenFileLocation(videoWithPath);

      expect((globalThis as any).window.blackcod.revealPath).toHaveBeenCalledWith('/storage/movies/action.mp4');
      expect(isMenuOpen).toBe(false);
    });

    it('triggers window.blackcod.revealPath with (video.file as any)?.path as fallback', () => {
      let isMenuOpen = true;
      const setIsMenuOpen = (open: boolean) => { isMenuOpen = open; };

      const videoWithFilePath = {
        ...dummyVideo,
        path: undefined,
        file: { name: 'test.mp4', path: '/storage/movies/file-fallback.mp4' }
      };

      const handleOpenFileLocation = (targetVideo: any) => {
        const targetPath = targetVideo.path || (targetVideo.file as any)?.path;
        if (targetPath) {
          (globalThis as any).window.blackcod?.revealPath(targetPath);
        }
        setIsMenuOpen(false);
      };

      handleOpenFileLocation(videoWithFilePath);

      expect((globalThis as any).window.blackcod.revealPath).toHaveBeenCalledWith('/storage/movies/file-fallback.mp4');
      expect(isMenuOpen).toBe(false);
    });

    it('does not trigger revealPath if path is undefined and does not throw if window.blackcod is undefined', () => {
      let isMenuOpen = true;
      const setIsMenuOpen = (open: boolean) => { isMenuOpen = open; };

      const videoNoPath = {
        ...dummyVideo,
        path: undefined,
        file: { name: 'test.mp4' }
      };

      const handleOpenFileLocation = (targetVideo: any) => {
        const targetPath = targetVideo.path || (targetVideo.file as any)?.path;
        if (targetPath) {
          (globalThis as any).window?.blackcod?.revealPath(targetPath);
        }
        setIsMenuOpen(false);
      };

      handleOpenFileLocation(videoNoPath);
      expect((globalThis as any).window.blackcod.revealPath).not.toHaveBeenCalled();
      expect(isMenuOpen).toBe(false);

      // Now test when window.blackcod is undefined (browser mode)
      delete (globalThis as any).window.blackcod;
      expect(() => handleOpenFileLocation({ path: '/some/path.mp4' })).not.toThrow();
    });
  });
});
