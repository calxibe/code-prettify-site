/* Pure, bounded operations for the public tools. Also exercised directly by tests. */
(function (root) {
  "use strict";
  const MAX_CHARS = 100000;
  const MAX_NODES = 10000;
  const MAX_DEPTH = 40;
  const LIMITS = { maxInputChars: MAX_CHARS, maxOutputChars: 1000000, maxNodes: MAX_NODES };

  function checkShape(value) {
    const pending = [[value, 0]];
    let count = 0;
    while (pending.length) {
      const [item, depth] = pending.pop();
      if (++count > MAX_NODES) throw new Error("Use a sample with at most 10,000 values.");
      if (depth > MAX_DEPTH) throw new Error("Use a sample with at most 40 nesting levels.");
      if (item && typeof item === "object") {
        for (const child of Object.values(item)) pending.push([child, depth + 1]);
      }
    }
  }

  function strictJson(source, label) {
    if (typeof source !== "string" || !source.trim()) throw new Error(`${label}: paste JSON to begin.`);
    if (source.length > MAX_CHARS) throw new Error(`${label}: limit input to 100,000 characters.`);
    let value;
    try { value = JSON.parse(source); } catch (error) { throw new Error(`${label}: ${error.message}`); }
    checkShape(value);
    // Refuse JSON numbers that JavaScript would silently round or turn into Infinity.
    try { root.CodePrettifyStructuredWorkbench.repair(source, LIMITS); }
    catch (error) { throw new Error(`${label}: ${error.message}`); }
    return value;
  }

  const pointer = (parent, key) => `${parent}/${String(key).replace(/~/g, "~0").replace(/\//g, "~1")}`;
  const kind = value => value === null ? "null" : Array.isArray(value) ? "array" : typeof value;

  function changesBetween(before, after, path, changes) {
    if (before === after) return;
    if (kind(before) !== kind(after) || before === null || typeof before !== "object") {
      changes.push({ path, kind: "changed", before, after });
      return;
    }
    if (Array.isArray(before)) {
      for (let index = 0; index < Math.max(before.length, after.length); index++) {
        const childPath = pointer(path, index);
        if (index >= before.length) changes.push({ path: childPath, kind: "added", after: after[index] });
        else if (index >= after.length) changes.push({ path: childPath, kind: "removed", before: before[index] });
        else changesBetween(before[index], after[index], childPath, changes);
      }
      return;
    }
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const childPath = pointer(path, key);
      if (!Object.hasOwn(before, key)) changes.push({ path: childPath, kind: "added", after: after[key] });
      else if (!Object.hasOwn(after, key)) changes.push({ path: childPath, kind: "removed", before: before[key] });
      else changesBetween(before[key], after[key], childPath, changes);
    }
  }

  function indexRecords(value, key, label) {
    if (!Array.isArray(value)) throw new Error(`${label}: paste a JSON array of objects.`);
    if (value.length > 1500) throw new Error(`${label}: use at most 1,500 records.`);
    const records = new Map();
    value.forEach((record, index) => {
      if (!record || Array.isArray(record) || typeof record !== "object" || !Object.hasOwn(record, key)) {
        throw new Error(`${label}: record ${index + 1} needs its own "${key}" field.`);
      }
      const id = record[key];
      if (!(typeof id === "string" && id.length > 0) && !(typeof id === "number" && Number.isFinite(id))) {
        throw new Error(`${label}: record ${index + 1} needs a non-empty string or number in "${key}".`);
      }
      const identity = JSON.stringify([typeof id, id]);
      if (records.has(identity)) throw new Error(`${label}: duplicate "${key}" value ${JSON.stringify(id)}. Choose a unique field.`);
      records.set(identity, { id, index, record });
    });
    return records;
  }

  function arrayDiff(payload) {
    const key = String(payload.key || "").trim();
    if (!key || key.length > 80) throw new Error("Enter a top-level identity field of 1–80 characters, such as id or sku.");
    const left = indexRecords(strictJson(payload.before, "Before"), key, "Before");
    const right = indexRecords(strictJson(payload.after, "After"), key, "After");
    const report = { key, counts: { added: 0, removed: 0, changed: 0, unchanged: 0 }, added: [], removed: [], changed: [] };
    for (const [identity, item] of left) {
      const other = right.get(identity);
      if (!other) { report.removed.push(item); continue; }
      const changes = [];
      changesBetween(item.record, other.record, "", changes);
      if (changes.length) report.changed.push({ id: item.id, beforeIndex: item.index, afterIndex: other.index, changes });
      else report.counts.unchanged++;
    }
    for (const [identity, item] of right) if (!left.has(identity)) report.added.push(item);
    for (const category of ["added", "removed", "changed"]) report.counts[category] = report[category].length;
    const text = JSON.stringify(report, null, 2);
    if (text.length > 1000000) throw new Error("The comparison report is too large. Compare a smaller selection of records.");
    return { report, text };
  }

  function repair(payload) {
    // Keep the product's repair limits, provenance, and JSON Lines output.
    // Diagram and comparison limits must not restrict the repair workbench.
    const result = root.CodePrettifyStructuredWorkbench.repair(payload.input, {
      allowPartialRecords: payload.allowPartialRecords === true,
      indentSize: payload.indentSize,
    });
    return {
      text: result.text, repairs: result.repairs, warnings: result.warnings,
      confidence: result.confidence, format: result.format,
      changed: result.changed, discarded: result.discarded, nodeCount: result.nodeCount,
    };
  }

  function diagram(payload) {
    strictJson(payload.input, "JSON input");
    const options = { fileType: "json", orientation: payload.orientation, includeValues: payload.includeValues === true, theme: payload.theme, maxInputChars: MAX_CHARS, maxNodes: 60, maxDepth: 8, maxFieldsPerCard: 12 };
    let model = root.CodePrettifyDiagramGenerator.buildModel(payload.input, options);
    if (!options.includeValues) {
      // The product renderer can use raw hex values for color swatches. Strip
      // that metadata as well as visible values before a structure-only export.
      model = { ...model, nodes: model.nodes.map(node => ({ ...node, fields: node.fields.map(field => ({ ...field, rawValue: null })) })) };
    }
    const result = root.CodePrettifyDiagramGenerator.renderSvg(model, options);
    return { svg: result.svg, mermaid: root.CodePrettifyDiagramGenerator.toMermaid(model, options), nodeCount: model.nodeCount, edgeCount: model.edgeCount, truncated: model.truncated, width: result.width, height: result.height };
  }

  const handlers = { repair, diagram, "array-diff": arrayDiff };
  const api = Object.freeze({ run: (name, payload) => {
    if (!Object.hasOwn(handlers, name)) throw new Error("Unknown tool.");
    return handlers[name](payload || {});
  } });
  root.CodePrettifyOnlineTools = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
