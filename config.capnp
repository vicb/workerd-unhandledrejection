using Workerd = import "/workerd/workerd.capnp";

# Run with `workerd test config.capnp`.
const config :Workerd.Config = (
  services = [
    # The bug: the listener rejects a promise synchronously.
    ( name = "listener-rejects-synchronously",
      worker = (
        modules = [(name = "worker", esModule = embed "worker.js")],
        compatibilityDate = "2026-03-03",
        bindings = [(name = "MODE", text = "sync")],
      )
    ),
    # The same bug with an async listener that throws.
    ( name = "async-listener-throws",
      worker = (
        modules = [(name = "worker", esModule = embed "worker-async-listener.js")],
        compatibilityDate = "2026-03-03",
      )
    ),
    # The same bug with a listener that handles the promise of the event.
    ( name = "listener-handles-the-promise",
      worker = (
        modules = [(name = "worker", esModule = embed "worker-listener-handles-promise.js")],
        compatibilityDate = "2026-03-03",
      )
    ),
    # Control: the listener rejects the same promise from a microtask.
    ( name = "control-listener-rejects-in-a-microtask",
      worker = (
        modules = [(name = "worker", esModule = embed "worker.js")],
        compatibilityDate = "2026-03-03",
        bindings = [(name = "MODE", text = "microtask")],
      )
    ),
    # Control: the async listener that throws, without the flag.
    ( name = "control-async-listener-flag-disabled",
      worker = (
        modules = [(name = "worker", esModule = embed "worker-async-listener.js")],
        compatibilityDate = "2026-03-03",
        compatibilityFlags = ["no_unhandled_rejection_after_microtask_checkpoint"],
      )
    ),
    # Control: the listener that handles the promise, without the flag.
    ( name = "control-listener-handles-the-promise-flag-disabled",
      worker = (
        modules = [(name = "worker", esModule = embed "worker-listener-handles-promise.js")],
        compatibilityDate = "2026-03-03",
        compatibilityFlags = ["no_unhandled_rejection_after_microtask_checkpoint"],
      )
    ),
    # Control: same as the bug, without `unhandled_rejection_after_microtask_checkpoint`.
    ( name = "control-flag-disabled",
      worker = (
        modules = [(name = "worker", esModule = embed "worker.js")],
        compatibilityDate = "2026-03-03",
        compatibilityFlags = ["no_unhandled_rejection_after_microtask_checkpoint"],
        bindings = [(name = "MODE", text = "sync")],
      )
    ),
  ],
);
