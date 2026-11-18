// An `unhandledrejection` listener that rejects a promise synchronously stops the processing of
// every later unhandled rejection in the isolate.

const seen = [];
let mode;

addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  seen.push(event.reason);
  if (event.reason === 'trigger') {
    if (mode === 'microtask') {
      // Control: the same rejection, one microtask later.
      queueMicrotask(() => void Promise.reject('rejected by the listener'));
    } else {
      void Promise.reject('rejected by the listener');
    }
  }
});

export default {
  async test(controller, env) {
    mode = env.MODE;

    for (const reason of ['a', 'trigger', 'b', 'c']) {
      void Promise.reject(reason);
      await scheduler.wait(10);
      console.log(`after reject(${JSON.stringify(reason)}), the listener saw: ${JSON.stringify(seen)}`);
    }

    const expected = ['a', 'trigger', 'rejected by the listener', 'b', 'c'];
    if (JSON.stringify(seen) !== JSON.stringify(expected)) {
      throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(seen)}`);
    }
  },
};
