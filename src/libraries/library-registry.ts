import fse from 'fs-extra';
import path from 'path';

export type LibraryEntry = {
  id: string;
  name: string;
  path: string;
  lastOpened: string; // ISO 8601
};

type RegistryFile = {
  version: 1;
  entries: LibraryEntry[];
};

/**
 * Manages the global list of known Allusion libraries, stored in a JSON file
 * inside the OS application-data directory (NOT userData, so it persists across
 * library switches).
 *
 * Construct via LibraryRegistry.create() for production use, or
 * new LibraryRegistry(filePath) for testing.
 */
export class LibraryRegistry {
  private readonly registryFilePath: string;

  constructor(registryFilePath: string) {
    this.registryFilePath = registryFilePath;
  }

  /** Factory for production use — reads appData path from Electron. */
  static create(): LibraryRegistry {
    // Dynamic require avoids a top-level `import { app } from 'electron'` which would
    // break Jest tests (no Electron in test environment).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron') as typeof import('electron');
    return new LibraryRegistry(
      path.join(app.getPath('appData'), 'Allusion', 'libraries.json'),
    );
  }

  private read(): RegistryFile {
    try {
      const data = fse.readJSONSync(this.registryFilePath) as RegistryFile;
      if (data.version === 1 && Array.isArray(data.entries)) {
        return data;
      }
    } catch {
      // File does not exist yet or is corrupt — start fresh.
    }
    return { version: 1, entries: [] };
  }

  private write(registry: RegistryFile): void {
    fse.outputJSONSync(this.registryFilePath, registry, { spaces: 2 });
  }

  listLibraries(): LibraryEntry[] {
    return this.read().entries;
  }

  hasLibrary(libraryPath: string): boolean {
    return this.read().entries.some((e) => e.path === libraryPath);
  }

  /** Adds a library, or updates the name + lastOpened if the path already exists. */
  addLibrary(name: string, libraryPath: string): LibraryEntry {
    const registry = this.read();
    const existing = registry.entries.find((e) => e.path === libraryPath);
    if (existing) {
      existing.name = name;
      existing.lastOpened = new Date().toISOString();
      this.write(registry);
      return existing;
    }
    const entry: LibraryEntry = {
      id: globalThis.crypto.randomUUID(),
      name,
      path: libraryPath,
      lastOpened: new Date().toISOString(),
    };
    registry.entries.push(entry);
    this.write(registry);
    return entry;
  }

  removeLibrary(id: string): void {
    const registry = this.read();
    registry.entries = registry.entries.filter((e) => e.id !== id);
    this.write(registry);
  }

  renameLibrary(id: string, name: string): void {
    const registry = this.read();
    const entry = registry.entries.find((e) => e.id === id);
    if (entry) {
      entry.name = name;
      this.write(registry);
    }
  }

  updateLastOpened(libraryPath: string): void {
    const registry = this.read();
    const entry = registry.entries.find((e) => e.path === libraryPath);
    if (entry) {
      entry.lastOpened = new Date().toISOString();
      this.write(registry);
    }
  }
}
