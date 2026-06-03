// Solution from https://stackoverflow.com/questions/52612122/how-to-use-jest-to-test-functions-using-crypto-or-window-mscrypto#answer-67332178.
global.crypto = {
  randomUUID: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    return crypto.randomUUID();
  },
};

// In the Node test environment `window` is not defined; shim it so code that
// calls window.setTimeout / window.clearTimeout works (Node exposes these as globals).
if (typeof window === 'undefined') {
  global.window = global;
}
