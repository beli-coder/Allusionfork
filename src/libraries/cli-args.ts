import path from 'path';

/**
 * Parses the --library <path> CLI flag from an argv array.
 * Returns the resolved absolute path, or null if the flag is absent or malformed.
 */
export function resolveCliLibraryPath(argv: string[] = process.argv): string | null {
  const idx = argv.indexOf('--library');
  if (idx !== -1 && idx + 1 < argv.length) {
    return path.resolve(argv[idx + 1]);
  }
  return null;
}

/**
 * Returns a new argv array (process.argv.slice(1) style) with the --library flag
 * replaced (or appended) to point at newLibraryPath.
 */
export function buildLibraryArgs(currentArgv: string[], newLibraryPath: string): string[] {
  const filtered: string[] = [];
  for (let i = 0; i < currentArgv.length; i++) {
    if (currentArgv[i] === '--library') {
      i++; // drop this flag and its value
    } else {
      filtered.push(currentArgv[i]);
    }
  }
  filtered.push('--library', newLibraryPath);
  return filtered;
}
