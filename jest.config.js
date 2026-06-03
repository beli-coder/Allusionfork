module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Mirror tsconfig baseUrl so absolute-path imports like 'src/api/foo' resolve correctly.
  modulePaths: ['<rootDir>'],
  // Stub out CSS/SCSS imports — they are no-ops in the test environment.
  moduleNameMapper: {
    '\\.(css|scss|sass)$': '<rootDir>/tests/setup/styleMock.js',
  },
  setupFiles: [
    // FIXME: I did not manage to get Dexie working in an actual Electron test environment. Testing in JavaScript is
    // cursed, so indexeddb is replaced by an in-memory implementation.
    'fake-indexeddb/auto',
    // Crypto module is not stable in the node version we use, nor can we use the browser.
    '<rootDir>/tests/setup/jest.crypto.js',
  ],
  transform: {
    // esModuleInterop is required so that `import X from 'cjs-module'` works in Jest
    // (the project tsconfig uses module: ESNext without esModuleInterop).
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { esModuleInterop: true } }],
  },
};
