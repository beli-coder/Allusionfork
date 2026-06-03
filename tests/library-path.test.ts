import path from 'path';
import { resolveCliLibraryPath, buildLibraryArgs } from '../src/libraries/cli-args';

describe('resolveCliLibraryPath', () => {
  test('returns null when --library flag is absent', () => {
    expect(resolveCliLibraryPath(['electron', '.'])).toBeNull();
  });

  test('returns null for an empty argv', () => {
    expect(resolveCliLibraryPath([])).toBeNull();
  });

  test('returns null when --library appears as the last arg (no value follows)', () => {
    expect(resolveCliLibraryPath(['electron', '.', '--library'])).toBeNull();
  });

  test('returns the resolved absolute path when --library /abs/path is given', () => {
    const result = resolveCliLibraryPath(['electron', '.', '--library', '/abs/path']);
    expect(result).toBe('/abs/path');
  });

  test('resolves a relative path to absolute using process.cwd()', () => {
    const result = resolveCliLibraryPath(['electron', '.', '--library', 'relative/dir']);
    expect(result).toBe(path.resolve('relative/dir'));
  });

  test('works when --library appears after other flags', () => {
    const result = resolveCliLibraryPath(['electron', '.', '--inspect', '--library', '/my/lib']);
    expect(result).toBe('/my/lib');
  });

  test('works when --library appears before other flags', () => {
    const result = resolveCliLibraryPath(['electron', '.', '--library', '/my/lib', '--inspect']);
    expect(result).toBe('/my/lib');
  });

  test('takes the first --library occurrence when the flag appears multiple times', () => {
    const result = resolveCliLibraryPath([
      'electron',
      '.',
      '--library',
      '/first',
      '--library',
      '/second',
    ]);
    expect(result).toBe('/first');
  });
});

describe('buildLibraryArgs', () => {
  test('appends --library to an argv with no existing flag', () => {
    expect(buildLibraryArgs(['.', '--inspect'], '/new/lib')).toEqual([
      '.',
      '--inspect',
      '--library',
      '/new/lib',
    ]);
  });

  test('replaces an existing --library value', () => {
    expect(buildLibraryArgs(['.', '--library', '/old/lib'], '/new/lib')).toEqual([
      '.',
      '--library',
      '/new/lib',
    ]);
  });

  test('removes --library from the middle and appends to end', () => {
    expect(
      buildLibraryArgs(['.', '--inspect', '--library', '/old/lib', '--other'], '/new/lib'),
    ).toEqual(['.', '--inspect', '--other', '--library', '/new/lib']);
  });

  test('handles an empty argv array', () => {
    expect(buildLibraryArgs([], '/new/lib')).toEqual(['--library', '/new/lib']);
  });

  test('handles multiple --library flags by stripping all of them', () => {
    const result = buildLibraryArgs(
      ['.', '--library', '/a', '--library', '/b'],
      '/new/lib',
    );
    expect(result).toEqual(['.', '--library', '/new/lib']);
  });
});
