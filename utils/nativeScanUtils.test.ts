import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanNativeDirectory } from './nativeScanUtils';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('native directory scanning', () => {
  it('returns video descriptors recursively and ignores non-video files', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'blackcod-scan-'));
    temporaryDirectories.push(root);
    await mkdir(path.join(root, 'nested'));
    await writeFile(path.join(root, 'video.MP4'), 'video');
    await writeFile(path.join(root, 'notes.txt'), 'notes');
    await writeFile(path.join(root, 'nested', 'clip.webm'), 'clip');

    const result = await scanNativeDirectory(root);

    expect(result.map(item => item.relativePath).sort()).toEqual(['nested/clip.webm', 'video.MP4']);
    expect(result.every(item => item.size > 0 && item.lastModified > 0)).toBe(true);
  });
});
