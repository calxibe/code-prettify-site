/* Runs only inside a local Web Worker; input is never sent to a server. */
self.addEventListener("message", event => {
  try {
    self.postMessage({ ok: true, result: self.CodePrettifyOnlineTools.run(event.data.kind, event.data.payload) });
  } catch (error) {
    self.postMessage({ ok: false, message: error.message || "The sample could not be processed." });
  }
});
