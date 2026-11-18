// Same bug as `worker.js`, triggered without calling `Promise.reject()`: an `async` listener that
// throws before its first `await` returns a promise that is rejected while the listener runs.

const seen = [];

addEventListener('unhandledrejection', async (event) => {
  event.preventDefault();
  seen.push(String(event.reason));
  if (event.reason === 'trigger') {
    throw new Error('thrown by the async listener');
  }
});

export default {
  async test() {
    for (const reason of ['a', 'trigger', 'b', 'c']) {
      void Promise.reject(reason);
      await scheduler.wait(10);
      console.log(`after reject(${JSON.stringify(reason)}), the listener saw: ${JSON.stringify(seen)}`);
    }

    const expected = ['a', 'trigger', 'Error: thrown by the async listener', 'b', 'c'];
    if (JSON.stringify(seen) !== JSON.stringify(expected)) {
      throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(seen)}`);
    }
  },
};
