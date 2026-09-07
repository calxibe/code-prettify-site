/* Website controls shared by the repair, diagram, and array comparison tools. */
(() => {
  "use strict";
  const tool = document.querySelector("[data-online-tool]");
  if (!tool) return;
  const kind = tool.dataset.onlineTool;
  const controls = tool.querySelector("fieldset");
  const inputs = Array.from(tool.querySelectorAll("[data-tool-input]"));
  const defaults = inputs.map(input => ({ value: input.value, checked: input.checked }));
  const status = tool.querySelector("[data-tool-status]");
  const output = tool.querySelector("[data-tool-output]");
  const report = tool.querySelector("[data-tool-report]");
  const actions = Array.from(tool.querySelectorAll("[data-result-action]"));
  const preview = tool.querySelector("[data-diagram-image]");
  let result = null;
  let worker = null;
  let timeout = null;
  let revision = 0;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("code-tool-status-error", error);
  }

  function cancel() {
    revision++;
    if (worker) worker.terminate();
    worker = null;
    clearTimeout(timeout);
    tool.removeAttribute("aria-busy");
  }

  function reset() {
    cancel();
    result = null;
    if (output) output.value = "";
    if (report) report.replaceChildren();
    if (preview) { preview.removeAttribute("src"); preview.hidden = true; }
    actions.forEach(button => { button.disabled = true; });
  }

  function payload() {
    return Object.fromEntries(inputs.map(input => [input.dataset.toolInput, input.type === "checkbox" ? input.checked : input.value]));
  }

  function appendItem(parent, tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    parent.append(element);
    return element;
  }

  function showResult(value) {
    result = value;
    actions.forEach(button => { button.disabled = false; });
    if (kind === "repair") {
      output.value = value.text;
      appendItem(report, "h3", value.repairs.length ? "Repair report" : "Already valid JSON");
      if (value.repairs.length) {
        const list = document.createElement("ul");
        for (const item of value.repairs) appendItem(list, "li", `${item.message}${item.count > 1 ? ` (${item.count} occurrences)` : ""}`);
        report.append(list);
      } else appendItem(report, "p", "No syntax repair was needed. The output is formatted with two-space indentation.");
      if (value.confidence === "medium") appendItem(report, "p", "Structural repairs were needed. Check the output against your original source before using it.", "code-tool-warning");
      for (const warning of value.warnings) appendItem(report, "p", warning, "code-tool-warning");
      setStatus(`${value.repairs.length} repair ${value.repairs.length === 1 ? "category" : "categories"}. Review the result before copying or downloading.`);
    } else if (kind === "diagram") {
      preview.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value.svg)}`;
      preview.hidden = false;
      output.value = value.mermaid;
      setStatus(`${value.nodeCount} cards and ${value.edgeCount} connections generated.${value.truncated ? " Diagram limits reached; some structure is omitted. Use a smaller sample for a complete view." : ""}`);
    } else {
      output.value = value.text;
      const { counts } = value.report;
      setStatus(`${counts.added} added · ${counts.removed} removed · ${counts.changed} changed · ${counts.unchanged} unchanged. Root-array order is ignored.`);
      appendItem(report, "h3", "Record changes");
      const changes = [
        ...value.report.added.map(item => ({ label: "Added", id: item.id, detail: `After index ${item.index}` })),
        ...value.report.removed.map(item => ({ label: "Removed", id: item.id, detail: `Before index ${item.index}` })),
        ...value.report.changed.map(item => ({ label: "Changed", id: item.id, detail: item.changes.map(change => `${change.kind}: ${change.path || "/"}`).join("; ") })),
      ];
      if (!changes.length) appendItem(report, "p", "No added, removed, or changed records. Reordering root records and object keys does not count as a change.");
      else {
        const list = document.createElement("ul");
        list.className = "online-diff-list";
        for (const item of changes.slice(0, 100)) {
          const row = document.createElement("li");
          appendItem(row, "strong", `${item.label}: ${JSON.stringify(item.id)}`);
          appendItem(row, "span", item.detail.length > 500 ? item.detail.slice(0, 500) + "…" : item.detail);
          list.append(row);
        }
        report.append(list);
        if (changes.length > 100) appendItem(report, "p", "Showing the first 100 records. The JSON report below contains the full result.");
      }
    }
  }

  function generate() {
    reset();
    const data = payload();
    if (Object.values(data).some(value => typeof value === "string" && value.length > 100000)) {
      setStatus("Limit each input to 100,000 characters.", true);
      return;
    }
    setStatus("Processing locally…");
    tool.setAttribute("aria-busy", "true");
    try {
      worker = new Worker(tool.dataset.worker);
      const activeWorker = worker;
      timeout = setTimeout(() => { cancel(); setStatus("This sample took too long. Try a smaller part of the document.", true); }, 5000);
      worker.onmessage = event => {
        if (worker !== activeWorker) return;
        cancel();
        if (event.data.ok) showResult(event.data.result);
        else setStatus(event.data.message, true);
      };
      worker.onerror = event => { event.preventDefault(); if (worker !== activeWorker) return; cancel(); setStatus("The tool could not start. Reload this page and try again.", true); };
      worker.postMessage({ kind, payload: data });
    } catch {
      cancel();
      setStatus("This browser could not start the tool. Enable JavaScript and Web Workers, then reload.", true);
    }
  }

  function outputFor(action) {
    if (action === "svg") return { text: result.svg, type: "image/svg+xml", name: "json-diagram.svg" };
    if (action === "mermaid") return { text: result.mermaid, type: "text/plain", name: "json-diagram.mmd" };
    if (action === "repair-report") return { text: JSON.stringify({ format: result.format, repairs: result.repairs, warnings: result.warnings }, null, 2), type: "application/json", name: "json-repair-report.json" };
    return { text: result.text, type: "application/json", name: kind === "repair" ? "repaired.json" : "array-diff-report.json" };
  }

  tool.querySelector("[data-generate]").addEventListener("click", generate);
  tool.querySelector("[data-example]").addEventListener("click", () => {
    inputs.forEach((input, index) => { input.value = defaults[index].value; input.checked = defaults[index].checked; });
    generate();
  });
  tool.querySelector("[data-clear]").addEventListener("click", () => {
    reset();
    inputs.filter(input => input.tagName === "TEXTAREA").forEach(input => { input.value = ""; });
    setStatus("Cleared. Paste a new sample or load the example.");
    inputs.find(input => input.tagName === "TEXTAREA").focus();
  });
  for (const input of inputs) {
    input.addEventListener("input", () => { reset(); setStatus("Input changed. Run the tool to update the result."); });
    if (input.tagName === "TEXTAREA") input.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); generate(); }
    });
  }
  for (const button of actions) button.addEventListener("click", async () => {
    if (!result) return;
    const value = outputFor(button.dataset.resultAction);
    if (button.hasAttribute("data-copy")) {
      const copiedRevision = revision;
      try {
        await navigator.clipboard.writeText(value.text);
        if (revision === copiedRevision) setStatus("Copied to the clipboard.");
      } catch {
        if (revision !== copiedRevision) return;
        output.closest("details")?.setAttribute("open", "");
        output.focus(); output.select();
        setStatus("Automatic copy is unavailable. The output is selected; use your keyboard's Copy shortcut.");
      }
    } else {
      const url = URL.createObjectURL(new Blob([value.text], { type: value.type }));
      const link = document.createElement("a");
      link.href = url; link.download = value.name;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Download ready.");
    }
  });
  for (const button of tool.querySelectorAll("[data-diagram-size]")) button.addEventListener("click", () => {
    tool.querySelector(".online-diagram-stage").classList.toggle("online-diagram-fit", button.dataset.diagramSize === "fit");
    tool.querySelectorAll("[data-diagram-size]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  });
  window.addEventListener("pagehide", cancel);
  controls.disabled = false;
  generate();
})();
