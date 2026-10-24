const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = path.join(process.argv[2], '_expo', 'static', 'js', 'web');
const bundle = fs.readdirSync(dir).find((f) => f.startsWith('index-') && f.endsWith('.js'));

const element = () => ({
  style: {},
  setAttribute() {},
  appendChild() {},
  removeChild() {},
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
  childNodes: [],
});
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  queueMicrotask,
  TextEncoder,
  TextDecoder,
  URL,
  URLSearchParams,
  AbortController,
  AbortSignal,
  Headers,
  Request,
  Response,
  ReadableStream,
  Blob,
  FormData,
  Event,
  EventTarget,
  crypto: globalThis.crypto,
  performance,
  structuredClone,
  WebSocket: class {
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  },
  fetch: async () => {
    throw new Error('network disabled in smoke test');
  },
  navigator: { userAgent: 'smoke', product: 'Gecko', language: 'en' },
  location: { href: 'http://localhost/', protocol: 'http:', host: 'localhost', pathname: '/' },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: {
    getElementById: () => element(),
    createElement: element,
    createTextNode: element,
    head: element(),
    body: element(),
    documentElement: element(),
    addEventListener() {},
    querySelector: () => null,
  },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }),
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

let failure = null;
const record = (e) => {
  failure ??= e;
};
process.on('uncaughtException', record);
process.on('unhandledRejection', record);
const origError = console.error;
sandbox.console = { ...console, error: (...args) => { record(args[0]); origError(...args); } };

try {
  vm.runInNewContext(fs.readFileSync(path.join(dir, bundle), 'utf8'), sandbox, { filename: bundle });
} catch (e) {
  record(e);
}

setTimeout(() => {
  // React/DOM errors from the fake document are expected; module-init errors are not.
  const message = failure ? String(failure && failure.stack ? failure.stack : failure) : '';
  const initCrash = /before initialization|is not defined|Cannot find module|Requiring unknown module/.test(
    message,
  );
  if (initCrash || failure instanceof SyntaxError || failure?.name === 'SyntaxError') {
    console.log(`SMOKE FAIL: ${failure?.name}: ${failure?.message ?? message.split('\n')[0]}`);
    process.exit(1);
  }
  console.log(`SMOKE OK${failure ? ` (non-init error, expected with fake DOM: ${String(failure).split('\n')[0]})` : ''}`);
  process.exit(0);
}, 1500);
