import path from 'path';

export const normalizeNativePath = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim() || !path.isAbsolute(value) || value.includes('\0')) {
    return null;
  }
  return path.normalize(value);
};

export const isPathWithin = (candidate: string, root: string): boolean => {
  const normalizedCandidate = path.resolve(candidate);
  const normalizedRoot = path.resolve(root);
  return normalizedCandidate === normalizedRoot
    || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
};
