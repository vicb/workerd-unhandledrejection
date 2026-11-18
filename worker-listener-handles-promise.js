// Same bug as `worker.js`, triggered without rejecting anything: the listener handles the promise
// of the event, as a listener does to mark a rejection as taken care of.

const seen = [];

addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  seen.push(event.reason);
  if (event.reason === 'trigger') {
    event.promise.catch(() => {});
  }
});

export default {
  async test() {
    for (const reason of ['a', 'trigger', 'b', 'c']) {
      void Promise.reject(reason);
      await scheduler.wait(10);
      console.log(`after reject(${JSON.stringify(reason)}), the listener saw: ${JSON.stringify(seen)}`);
    }

    const expected = ['a', 'trigger', 'b', 'c'];
    if (JSON.stringify(seen) !== JSON.stringify(expected)) {
      throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(seen)}`);
    }
  },
};
