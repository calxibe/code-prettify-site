# CodePrettify

Turn raw code, data, documentation, API responses, and feeds into a readable workspace.

Website: [prettify.cloud](https://prettify.cloud)

Complete guide: [User Manual](manual.html)

Current offer and competitor comparison: [Pricing](pricing.html)

From the workspace root, run `npm run test:site` to validate internal links, pricing and manual content, mobile navigation, dialog focus, and horizontal layout at 320/375/768/769/800px.

CodePrettify is available as a browser extension and as a Windows desktop application. Both products use a CodeMirror 6 viewer and share the core formatting, validation, inspection, conversion, comparison, and playground workflows. The desktop application adds native tabs, menus, file dialogs, and explicit CSV and HTML file support.

## Supported formats

The browser extension recognizes raw resources by URL and HTTP content type for:

- JavaScript and TypeScript (`.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`)
- JSON, JSON with Comments, and JSON Lines (`.json`, `.jsonc`, `.jsonl`, `.ndjson`)
- YAML and TOML (`.yaml`, `.yml`, `.toml`)
- Markdown (`.md`, `.markdown`)
- CSS
- XML, RSS, and Atom

CSV and HTML are intentionally desktop-only. Activating the extension on ordinary HTML pages would interfere with websites, while browsers normally download CSV responses instead of showing a page the extension can enhance.

## Reading and navigation

- Format dense or minified documents automatically and switch between Prettified/Raw or Rendered/Source views.
- Search with result navigation, jump to a line, fold code, and scan large files with the minimap.
- Use Document Navigator for JSON, JavaScript/TypeScript, and XML/RSS outlines in both products; the Windows app additionally exposes JSON Lines and Markdown headings.
- Inspect sortable table views for supported structured data.
- Preserve useful view state such as search text, folds, highlighted line, and display mode.
- Open local files from the extension launcher with drag-and-drop or a file picker; no `file://` permission is needed for that workflow.

## Validation and inspection

- See syntax errors, line references, suspicious-content warnings, document statistics, and format-specific diagnostics.
- Inspect and query JSON paths with autocomplete and copy actions.
- Validate JSON and JSONC against a local JSON Schema without fetching remote references or uploading the document.
- Decode useful values such as timestamps, Base64 data, and JWT payloads from the viewer.
- Render Markdown with raw HTML disabled. Network image sources are shown as links instead of being loaded automatically.

## Developer tools

- Compare the current document with pasted text using text or supported semantic comparison modes.
- Run JavaScript in a fresh, sandboxed Web Worker with console output, top-level `await`, and source-mapped errors. The worker has no DOM, extension API, Node.js module, local-file, or network access.
- Test regular expressions against the current document or session-local custom text, inspect capture groups, and copy the complete `/pattern/flags` expression.
- Compose requests in the HTTP Client, import cURL, manage local environments and saved requests, inspect responses, and copy cURL, `fetch()`, or PowerShell commands.
- Use the command palette (`Ctrl+Shift+P`) to find the actions relevant to the current document.

## Conversion and export

The offline Data Converter supports:

- Prettify, minify, stringify, parse, escape, and unescape JSON
- JSON to and from XML, CSV, YAML, and TSV
- Base64 and URL encoding and decoding
- SHA-256, SHA-384, SHA-512, and HMAC generation with hex and Base64 output
- Unix seconds, Unix milliseconds, and timezone-explicit ISO 8601 conversion
- UUID v4, UUID v7, and ULID generation

Documents can also be copied or exported as original, formatted, or minified text. Supported structured data can be exported as CSV or an HTML table, and supported views can be captured as an image.

## Privacy and page access

Viewer, formatting, validation, conversion, comparison, inspection, and playground processing stay on the device. CodePrettify does not sell browsing data, use it for advertising, or send supported page content to FixQuotes servers.

The browser extension needs access to the current raw-code page so it can detect and enhance supported resources across sites. The HTTP Client makes a network request only after the user presses **Send**, and only to the URL displayed in its request composer. In rare JavaScript character-encoding recovery cases, the extension may request the same resource URL directly from its existing origin to recover valid UTF-8 bytes.

See the full [privacy policy](https://prettify.cloud/privacy.html) for details.

## Keyboard shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+B` | Toggle the formatted/rendered and raw/source views |
| `Ctrl+Alt+C` | Copy code |
| `Ctrl+F` | Search |
| `Ctrl+G` | Go to line |
| `Ctrl+Alt+T` | Toggle the floating toolbar |
| `Ctrl+Alt+D` | Compare with clipboard |
| `Ctrl+Shift+P` | Open the command palette |

## Installation

- Install the browser extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/codeprettify-js-json-css/ijhgclhipdfnaphhcipbnblgoemcaioj).
- Install the Windows application from the [Microsoft Store](https://apps.microsoft.com/detail/9p0lp3pt6j7d).

Opening a local file through the extension launcher requires no special browser permission. To activate CodePrettify directly on a `file://` URL, enable **Allow access to file URLs** for the extension in the browser's extension-management page.

## Languages and release notes

The interface supports 14 languages: English, Norwegian, Swedish, Danish, German, French, Spanish, Italian, Portuguese, Russian, Chinese, Japanese, Korean, and Vietnamese.

- [Browser extension changelog](changelog.html)
- [Windows application changelog](changelog-app.html)

When product behavior changes, update `manual.html` alongside the implementation. Keep the Browser Extension / Windows App availability labels explicit where the two products differ.
