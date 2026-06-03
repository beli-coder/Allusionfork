import fse from 'fs-extra';
import os from 'os';
import path from 'path';
import { LibraryRegistry } from '../src/libraries/library-registry';

describe('LibraryRegistry', () => {
  let registry: LibraryRegistry;
  let registryFilePath: string;

  beforeEach(() => {
    registryFilePath = path.join(os.tmpdir(), `allusion-test-registry-${Date.now()}.json`);
    registry = new LibraryRegistry(registryFilePath);
  });

  afterEach(() => {
    fse.removeSync(registryFilePath);
  });

  // ── listLibraries ─────────────────────────────────────────────────────────

  test('listLibraries returns empty array when file does not exist', () => {
    expect(registry.listLibraries()).toEqual([]);
  });

  test('listLibraries returns all added entries', () => {
    registry.addLibrary('Work', '/users/me/work');
    registry.addLibrary('Personal', '/users/me/personal');
    const entries = registry.listLibraries();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.name)).toEqual(['Work', 'Personal']);
  });

  // ── addLibrary ────────────────────────────────────────────────────────────

  test('addLibrary creates a new entry with expected fields', () => {
    const entry = registry.addLibrary('Work', '/users/me/work');
    expect(entry.name).toBe('Work');
    expect(entry.path).toBe('/users/me/work');
    expect(typeof entry.id).toBe('string');
    expect(entry.id.length).toBeGreaterThan(0);
    expect(new Date(entry.lastOpened).getTime()).not.toBeNaN();
  });

  test('addLibrary with a duplicate path updates name instead of creating a second entry', () => {
    registry.addLibrary('Work', '/users/me/work');
    registry.addLibrary('Work Renamed', '/users/me/work');
    const entries = registry.listLibraries();
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Work Renamed');
  });

  test('addLibrary with different paths creates separate entries', () => {
    registry.addLibrary('A', '/lib-a');
    registry.addLibrary('B', '/lib-b');
    expect(registry.listLibraries()).toHaveLength(2);
  });

  // ── removeLibrary ─────────────────────────────────────────────────────────

  test('removeLibrary removes the entry with the given id', () => {
    const entry = registry.addLibrary('Work', '/users/me/work');
    registry.addLibrary('Personal', '/users/me/personal');
    registry.removeLibrary(entry.id);
    const entries = registry.listLibraries();
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Personal');
  });

  test('removeLibrary with an unknown id does nothing', () => {
    registry.addLibrary('Work', '/users/me/work');
    registry.removeLibrary('nonexistent-id');
    expect(registry.listLibraries()).toHaveLength(1);
  });

  // ── renameLibrary ─────────────────────────────────────────────────────────

  test('renameLibrary updates the display name', () => {
    const entry = registry.addLibrary('Work', '/users/me/work');
    registry.renameLibrary(entry.id, 'Studio');
    expect(registry.listLibraries()[0].name).toBe('Studio');
  });

  test('renameLibrary with an unknown id does nothing', () => {
    registry.addLibrary('Work', '/users/me/work');
    registry.renameLibrary('nonexistent-id', 'New Name');
    expect(registry.listLibraries()[0].name).toBe('Work');
  });

  // ── updateLastOpened ──────────────────────────────────────────────────────

  test('updateLastOpened changes the lastOpened timestamp', async () => {
    const entry = registry.addLibrary('Work', '/users/me/work');
    const original = entry.lastOpened;
    await new Promise((resolve) => setTimeout(resolve, 5));
    registry.updateLastOpened('/users/me/work');
    const updated = registry.listLibraries()[0].lastOpened;
    expect(updated).not.toBe(original);
    expect(new Date(updated) > new Date(original)).toBe(true);
  });

  test('updateLastOpened with an unknown path does nothing', () => {
    registry.addLibrary('Work', '/users/me/work');
    const before = registry.listLibraries()[0].lastOpened;
    registry.updateLastOpened('/nonexistent');
    expect(registry.listLibraries()[0].lastOpened).toBe(before);
  });

  // ── hasLibrary ────────────────────────────────────────────────────────────

  test('hasLibrary returns true for a registered path', () => {
    registry.addLibrary('Work', '/users/me/work');
    expect(registry.hasLibrary('/users/me/work')).toBe(true);
  });

  test('hasLibrary returns false for an unregistered path', () => {
    expect(registry.hasLibrary('/users/me/work')).toBe(false);
  });

  // ── persistence ───────────────────────────────────────────────────────────

  test('data survives re-instantiation from the same file', () => {
    registry.addLibrary('Work', '/users/me/work');
    registry.addLibrary('Personal', '/users/me/personal');

    const registry2 = new LibraryRegistry(registryFilePath);
    const entries = registry2.listLibraries();
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('Work');
    expect(entries[1].name).toBe('Personal');
  });

  test('handles a corrupt/invalid JSON file gracefully and returns empty list', () => {
    fse.writeFileSync(registryFilePath, 'not valid json {{{{');
    expect(registry.listLibraries()).toEqual([]);
  });

  test('handles a file with unexpected structure gracefully', () => {
    fse.writeJSONSync(registryFilePath, { version: 999, data: [] });
    expect(registry.listLibraries()).toEqual([]);
  });
});
