# workerd: an `unhandledrejection` listener can stop rejection processing for the isolate

When an `unhandledrejection` listener does one of the following **while it runs**, workerd never
delivers another `unhandledrejection` event in that isolate. There is no error or warning when it
happens.

- It rejects a promise that nothing handles (`Promise.reject(...)`).
- It is an `async` function and it throws before its first `await`.
- It handles the promise of the event (`event.promise.catch(() => {})`).

It needs `unhandled_rejection_after_microtask_checkpoint`, which is the default from compatibility
date 2026-03-03.

## Run it

```sh
npm install
npx workerd test config.capnp                      # the npm release pinned in package.json
<path to a built workerd> test config.capnp        # any other binary
node run-node.mjs                                  # the same tests on Node.js, as the reference
```

`workerd test` exits with 1 when the bug is present: the first three tests fail, the four controls
pass. On Node.js every test passes.

## Results

| Runtime | `listener-rejects-synchronously` | `async-listener-throws` | `listener-handles-the-promise` | Controls | Log |
| --- | --- | --- | --- | --- | --- |
| Node.js `v24.20.0` (reference) | PASS | PASS | PASS | PASS (1) | `results/node-v24.20.0.log` |
| workerd npm `1.20261118.1` (latest on 2026-11-18) | **FAIL** | **FAIL** | **FAIL** | PASS (4) | `results/npm-1.20261118.1.log` |
| workerd `main` at `8f9bacf81` (2026-11-17), built locally, no local change | **FAIL** | **FAIL** | **FAIL** | PASS (4) | `results/main-8f9bacf81.log` |

## How the repro works

There are three worker files. Each has one listener and the same test:

- The listener records every reason it sees in `seen`. When the reason is `'trigger'`, it does the
  one thing that file is about.
- The test rejects four promises that nothing handles: `'a'`, `'trigger'`, `'b'`, `'c'`. After each
  one it waits 10 ms, so that workerd has processed the rejection, and prints `seen`.
- The test passes when the listener saw every rejection, including `'b'` and `'c'`.

| File | What the listener does on `'trigger'` | Expected `seen` |
| --- | --- | --- |
| `worker.js` | `Promise.reject('rejected by the listener')` | `["a","trigger","rejected by the listener","b","c"]` |
| `worker-async-listener.js` | It is `async` and throws. The throw happens before the first `await`, so the promise the listener returns is rejected while the listener runs. Nothing handles that promise, so it is one more unhandled rejection. | `["a","trigger","Error: thrown by the async listener","b","c"]` |
| `worker-listener-handles-promise.js` | `event.promise.catch(() => {})`. It rejects nothing. | `["a","trigger","b","c"]` |

`config.capnp` runs these files as seven services:

| Service | File | Flag | Expected | Got |
| --- | --- | --- | --- | --- |
| `listener-rejects-synchronously` | `worker.js` | on | PASS | **FAIL** |
| `async-listener-throws` | `worker-async-listener.js` | on | PASS | **FAIL** |
| `listener-handles-the-promise` | `worker-listener-handles-promise.js` | on | PASS | **FAIL** |
| `control-listener-rejects-in-a-microtask` | `worker.js`, but the listener rejects from `queueMicrotask` | on | PASS | PASS |
| `control-flag-disabled` | `worker.js` | off | PASS | PASS |
| `control-async-listener-flag-disabled` | `worker-async-listener.js` | off | PASS | PASS |
| `control-listener-handles-the-promise-flag-disabled` | `worker-listener-handles-promise.js` | off | PASS | PASS |

"Off" is `no_unhandled_rejection_after_microtask_checkpoint`.

The controls show what it takes: the listener has to do it while it is running, and the flag has to
be on.

`run-node.mjs` runs the same three files on Node.js, to show what the expected lists are based on.
Node.js has no global `unhandledrejection` event, so the script maps the two globals the workers
use to their Node.js equivalents: `addEventListener('unhandledrejection', ...)` to
`process.on('unhandledRejection', ...)`, and `scheduler.wait()` to the one of
`node:timers/promises`. The worker files are not modified. It runs the three bug cases and the
microtask control; the flag controls only make sense on workerd. On Node.js the listener sees every
rejection in each case, in the order the tests expect. For the third case it also prints a
`PromiseRejectionHandledWarning`, which is how Node.js reports that a promise was handled after its
`unhandledRejection` event.

## Output on workerd

The three failing services:

```
[ TEST ] listener-rejects-synchronously
after reject("a"), the listener saw: ["a"]
after reject("trigger"), the listener saw: ["a","trigger","rejected by the listener"]
after reject("b"), the listener saw: ["a","trigger","rejected by the listener"]
after reject("c"), the listener saw: ["a","trigger","rejected by the listener"]

[ TEST ] async-listener-throws
after reject("a"), the listener saw: ["a"]
after reject("trigger"), the listener saw: ["a","trigger","Error: thrown by the async listener"]
after reject("b"), the listener saw: ["a","trigger","Error: thrown by the async listener"]
after reject("c"), the listener saw: ["a","trigger","Error: thrown by the async listener"]

[ TEST ] listener-handles-the-promise
after reject("a"), the listener saw: ["a"]
after reject("trigger"), the listener saw: ["a","trigger"]
after reject("b"), the listener saw: ["a","trigger"]
after reject("c"), the listener saw: ["a","trigger"]
```

`'b'` and `'c'` are never delivered. In the first two cases the rejection that the listener created
is delivered, so the bug is not that this one is lost: everything after it is.

## Impact

- The isolate stops reporting unhandled rejections: no `unhandledrejection` event and no
  "Uncaught (in promise)" log.
- It is isolate-wide and lasts until the isolate is replaced, so one request can turn it off for
  all the later ones.
- Ordinary listeners trigger it:
  - `event.promise.catch(() => {})` is a common way to mark a rejection as taken care of
    (`listener-handles-the-promise`).
  - An `async` listener that throws before its first `await` (`async-listener-throws`): a bug in an
    error-reporting listener turns error reporting off.

## Files

- `worker.js`: the listener that calls `Promise.reject()`, and the test.
- `worker-async-listener.js`: the `async` listener that throws, and the same test.
- `worker-listener-handles-promise.js`: the listener that handles `event.promise`, and the same test.
- `config.capnp`: the seven services.
- `run-node.mjs`: runs the tests on Node.js.
- `package.json`: pins the npm `workerd` release.
- `results/`: saved outputs of the three runs in the table above.
