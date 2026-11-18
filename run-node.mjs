// Runs the tests of `worker.js` and `worker-async-listener.js` on Node.js, as the reference.
//
// Node.js has no global `unhandledrejection` event: the two globals the workers use are mapped to
// their Node.js equivalents, `process.on('unhandledRejection')` and `scheduler.wait()` of
// `node:timers/promises`.

import { scheduler } from 'node:timers/promises';

globalThis.scheduler = scheduler;

globalThis.addEventListener = (type, listener) => {
  if (type !== 'unhandledrejection') {
    throw new Error(`unexpected event type: ${type}`);
  }
  process.on('unhandledRejection', (reason, promise) => {
    listener({ reason, promise, preventDefault() {} });
  });
};

const tests = [
  { name: 'listener-rejects-synchronously', file: './worker.js', mode: 'sync' },
  { name: 'async-listener-throws', file: './worker-async-listener.js' },
  { name: 'listener-handles-the-promise', file: './worker-listener-handles-promise.js' },
  { name: 'control-listener-rejects-in-a-microtask', file: './worker.js', mode: 'microtask' },
];

console.log(`node ${process.version}`);

let failed = false;
for (const { name, file, mode } of tests) {
  console.log(`[ TEST ] ${name}`);
  // Every test gets its own listener and its own copy of the module.
  process.removeAllListeners('unhandledRejection');
  const worker = await import(`${file}?test=${name}`);
  try {
    await worker.default.test(null, { MODE: mode });
    console.log(`[ PASS ] ${name}`);
  } catch (error) {
    failed = true;
    console.log(`[ FAIL ] ${name}: ${error.message}`);
  }
}

process.exitCode = failed ? 1 : 0;
