/* Site adapter for the product's JSON-to-Code engine. Input stays in this tab. */
(() => {
  "use strict";
  const tool = document.getElementById("typescript-tool");
  if (!tool || !window.CodePrettifyJsonToCode) return;

  const controls = tool.querySelector("fieldset");
  const input = document.getElementById("ts-input");
  const rootName = document.getElementById("ts-root-name");
  const output = document.getElementById("ts-output");
  const status = document.getElementById("ts-status");
  const warnings = document.getElementById("ts-warnings");
  const copy = document.getElementById("ts-copy");
  const download = document.getElementById("ts-download");
  const sample = input.value;
  let result = null;

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle("code-tool-status-error", isError);
  };

  const resetOutput = () => {
    result = null;
    output.value = "";
    warnings.textContent = "";
    warnings.hidden = true;
    copy.disabled = true;
    download.disabled = true;
    input.removeAttribute("aria-invalid");
  };

  const generate = () => {
    resetOutput();
    if (!input.value.trim()) {
      setStatus("Paste a JSON sample or choose Load example to begin.");
      return;
    }
    try {
      result = window.CodePrettifyJsonToCode.generate(input.value, {
        target: "typescript",
        rootName: rootName.value || "Customer",
        maxInputChars: 200000,
        maxOutputChars: 1000000,
        maxDepth: 40,
        maxValues: 10000,
      });
      output.value = result.text;
      copy.disabled = false;
      download.disabled = false;
      warnings.textContent = result.warningRecords.map((warning, index) => warning.code === "EMPTY_ARRAYS"
        ? `${warning.count} empty ${warning.count === 1 ? "array" : "arrays"} found. Populated samples supply the element type; otherwise it becomes unknown.`
        : result.warnings[index]).join(" ");
      warnings.hidden = !result.warnings.length;
      setStatus(`TypeScript generated from ${result.stats.samples} sample ${result.stats.samples === 1 ? "record" : "records"}. Review the types before using them.`);
    } catch (error) {
      result = null;
      input.setAttribute("aria-invalid", "true");
      setStatus(error.name === "JsonToCodeError" ? error.message : "Could not generate TypeScript. Check the sample and try again.", true);
    }
  };

  for (const control of [input, rootName]) {
    control.addEventListener("input", () => {
      resetOutput();
      setStatus("Input changed. Choose Generate TypeScript to update the result.");
    });
  }
  document.getElementById("ts-generate").addEventListener("click", generate);
  document.getElementById("ts-sample").addEventListener("click", () => {
    input.value = sample;
    rootName.value = "Customer";
    generate();
  });
  document.getElementById("ts-clear").addEventListener("click", () => {
    input.value = "";
    resetOutput();
    setStatus("Cleared. Paste JSON to generate a new result.");
    input.focus();
  });
  input.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      generate();
    }
  });
  copy.addEventListener("click", async () => {
    if (!result) return;
    const copiedResult = result;
    try {
      await navigator.clipboard.writeText(copiedResult.text);
      if (result === copiedResult) setStatus("TypeScript copied to the clipboard.");
    } catch {
      if (result !== copiedResult) return;
      output.focus();
      output.select();
      setStatus("Automatic copy is unavailable. The output is selected; use your keyboard's Copy shortcut.");
    }
  });
  download.addEventListener("click", () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.text], { type: result.mimeType }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.suffix}.ts`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Your TypeScript download is ready.");
  });

  controls.disabled = false;
  generate();
})();
