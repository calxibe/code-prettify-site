// ============================================================
// CodePrettify JavaScript Test File
// Tests: syntax highlighting, code folding, bracket matching,
//        clickable URLs, timestamp hover, JWT/base64 decode,
//        import links, and various JS language features.
// ============================================================

/* --------------- Imports / Requires --------------- */

import defaultExport from "./utils.js";
import { namedA, namedB } from "../lib/helpers.js";
import * as everything from "https://cdn.example.com/lib.js";

const fs = require("fs");
const path = require("./config/paths.js");
const fetcher = await import("./lazy-module.js");

/* --------------- Variables & Primitives --------------- */

const STRING_DOUBLE = "double-quoted string";
const STRING_SINGLE = 'single-quoted string';
const STRING_TEMPLATE = `template literal: ${1 + 2}`;
const MULTILINE_TEMPLATE = `
  line one
  line two with interpolation: ${STRING_DOUBLE.toUpperCase()}
  line three
`;

let integer = 42;
let float = 3.14159;
let scientific = 6.022e23;
let hex = 0xff;
let octal = 0o77;
let binary = 0b1010;
let bigInt = 9007199254740991n;

const TRUE = true;
const FALSE = false;
const NULL_VAL = null;
const UNDEF = undefined;
const SYMBOL = Symbol("description");

/* --------------- URLs (clickable link test) --------------- */

const apiUrl = "https://example.com/api/v1/resource";
const textWithUrl = "Visit https://example.com for more info";
const ftpUrl = 'ftp://files.example.com/data.zip';
const localhostUrl = `http://localhost:3000/health`;

/* --------------- Timestamps (hover decoration test) --------------- */

const unixSeconds = 1672531200;
const unixMilliseconds = 1672531200000;
const isoDate = "2023-01-01T00:00:00Z";
const isoDateOffset = "2023-06-15T14:30:00+02:00";

/* --------------- JWT & Base64 (decode decoration test) --------------- */

const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const base64String = "SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0IHN0cmluZyBlbmNvZGVkIGluIGJhc2U2NC4=";

/* --------------- Arrays & Objects (folding + bracket matching) --------------- */

const simpleArray = [1, 2, 3, 4, 5];

const nestedArray = [
  [1, 2, 3],
  ["a", "b", "c"],
  [
    { id: 1, name: "first" },
    { id: 2, name: "second" }
  ]
];

const config = {
  server: {
    host: "localhost",
    port: 8080,
    endpoints: ["/api", "/health", "/metrics"]
  },
  auth: {
    enabled: true,
    provider: "oauth2",
    scopes: ["read", "write", "admin"]
  },
  nested: {
    level1: {
      level2: {
        level3: {
          value: "deeply nested"
        }
      }
    }
  }
};

/* --------------- Functions (folding test) --------------- */

function greet(name) {
  return `Hello, ${name}!`;
}

function fibonacci(n) {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const arrowSimple = (x) => x * 2;

const arrowBlock = (items) => {
  const filtered = items.filter((item) => item > 0);
  const mapped = filtered.map((item) => ({
    value: item,
    squared: item ** 2
  }));
  return mapped;
};

function* idGenerator() {
  let id = 0;
  while (true) {
    yield id++;
  }
}

async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch failed:", error.message);
    throw error;
  }
}

/* --------------- Classes (folding + methods) --------------- */

class EventEmitter {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, []);
    }
    this.#listeners.get(event).push(callback);
    return this;
  }

  emit(event, ...args) {
    const callbacks = this.#listeners.get(event) || [];
    for (const cb of callbacks) {
      cb(...args);
    }
  }

  off(event, callback) {
    const callbacks = this.#listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

class DataProcessor extends EventEmitter {
  static VERSION = "1.0.0";
  #cache;

  constructor(options = {}) {
    super();
    this.#cache = new Map();
    this.options = { timeout: 5000, retries: 3, ...options };
  }

  get cacheSize() {
    return this.#cache.size;
  }

  set maxRetries(value) {
    this.options.retries = Math.max(1, value);
  }

  async process(input) {
    if (this.#cache.has(input)) {
      return this.#cache.get(input);
    }

    const result = await this.#transform(input);
    this.#cache.set(input, result);
    this.emit("processed", { input, result });
    return result;
  }

  async #transform(data) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(data.toString().toUpperCase()), 100);
    });
  }

  [Symbol.iterator]() {
    return this.#cache.entries();
  }
}

/* --------------- Control Flow (folding test) --------------- */

function controlFlowDemo(value) {
  // if / else if / else
  if (value > 100) {
    console.log("large");
  } else if (value > 10) {
    console.log("medium");
  } else {
    console.log("small");
  }

  // switch
  switch (typeof value) {
    case "number":
      console.log("numeric");
      break;
    case "string":
      console.log("textual");
      break;
    default:
      console.log("other");
  }

  // for loops
  for (let i = 0; i < 5; i++) {
    if (i === 3) continue;
    console.log(i);
  }

  for (const key in config) {
    console.log(key);
  }

  for (const item of simpleArray) {
    console.log(item);
  }

  // while / do-while
  let counter = 0;
  while (counter < 3) {
    counter++;
  }

  do {
    counter--;
  } while (counter > 0);

  // try / catch / finally
  try {
    JSON.parse("{invalid");
  } catch (e) {
    console.warn("Parse error:", e.message);
  } finally {
    console.log("cleanup done");
  }
}

/* --------------- Destructuring & Spread --------------- */

const { server: { host, port }, auth } = config;
const [first, second, ...rest] = simpleArray;

const merged = { ...config.server, ...config.auth };
const combined = [...simpleArray, ...nestedArray[0]];

function withDefaults({ name = "anonymous", age = 0, ...extra } = {}) {
  return { name, age, extra };
}

/* --------------- Promises & Async Patterns --------------- */

const delayed = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function parallelTasks() {
  const [a, b, c] = await Promise.all([
    fetchData("https://api.example.com/users"),
    fetchData("https://api.example.com/posts"),
    fetchData("https://api.example.com/comments")
  ]);
  return { a, b, c };
}

Promise.race([
  delayed(1000).then(() => "slow"),
  delayed(100).then(() => "fast")
]).then((winner) => {
  console.log(`Winner: ${winner}`);
});

/* --------------- Closures & Higher-Order Functions --------------- */

function createCounter(initial = 0) {
  let count = initial;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
    reset: () => { count = initial; }
  };
}

const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
const double = (n) => n * 2;
const addOne = (n) => n + 1;
const square = (n) => n ** 2;
const transform = pipe(double, addOne, square);

/* --------------- Proxy & Reflect --------------- */

const handler = {
  get(target, prop, receiver) {
    console.log(`Accessing: ${String(prop)}`);
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value, receiver) {
    console.log(`Setting: ${String(prop)} = ${value}`);
    return Reflect.set(target, prop, value, receiver);
  }
};

const observed = new Proxy({ x: 1, y: 2 }, handler);

/* --------------- Iterators & Generators --------------- */

function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

async function* asyncDataStream(urls) {
  for (const url of urls) {
    const data = await fetchData(url);
    yield data;
  }
}

/* --------------- WeakRef & FinalizationRegistry --------------- */

const registry = new FinalizationRegistry((value) => {
  console.log(`Collected: ${value}`);
});

function cacheWithWeakRef(factory) {
  let ref = null;
  return () => {
    const cached = ref?.deref();
    if (cached) return cached;
    const fresh = factory();
    ref = new WeakRef(fresh);
    registry.register(fresh, "cache-entry");
    return fresh;
  };
}

/* --------------- Tagged Template Literal --------------- */

function sql(strings, ...values) {
  return {
    text: strings.join("?"),
    params: values
  };
}

const userId = 42;
const query = sql`SELECT * FROM users WHERE id = ${userId} AND active = ${true}`;

/* --------------- Misc Patterns --------------- */

const nullishCoalescing = null ?? "default value";
const optionalChaining = config?.server?.host;
const logicalAssign = {};
logicalAssign.x ??= 10;
logicalAssign.y ||= 20;
logicalAssign.z &&= 30;

const REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Labeled statement
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (i === 1 && j === 1) break outer;
    console.log(i, j);
  }
}

/* --------------- Execution --------------- */

const processor = new DataProcessor({ timeout: 10000 });
processor.on("processed", ({ input, result }) => {
  console.log(`Processed "${input}" -> "${result}"`);
});

(async () => {
  const result = await processor.process("hello world");
  console.log("Result:", result);
  console.log("Cache size:", processor.cacheSize);
  console.log("Transform:", transform(3));

  for (const n of range(0, 10, 2)) {
    console.log(n);
  }
})();
