# CodePrettify

Transform raw code into a readable, beautiful workspace.

Website: https://prettify.cloud

CodePrettify automatically formats, validates, and highlights raw JavaScript, JSON, CSS, XML, and RSS/Atom resources the moment you open them. Whether you are viewing a minified API response, a feed, or a local config file, you get an IDE-like experience directly in your browser.

## 🚀 Smart Automation

*   **Broad Detection:** Detects supported resources by URL pattern and HTTP content type.
*   **Auto-Format:** Automatically beautifies dense or minified files using your preferred indentation.
*   **Zero-Flash Loading:** Prevents the raw text from flashing before the viewer is ready.
*   **Local File Support:** Works on web URLs and local files (`file://`) opened in the browser.

## 🛡️ Diagnostics & Validation

Don't just read code—debug it. CodePrettify scans your files for common errors:

*   **JSON:** Detects syntax errors and provides exact line references.
*   **JavaScript & CSS:** Validates structure and reports problems instantly.
*   **Diagnostics Panel:** Shows syntax status and file-type-specific insights.
*   **Document Warnings:** Flags very long lines, mixed indentation, and other quality issues.

> **Instant Feedback:** Invalid code triggers a non-intrusive toast notification with error details.

## 📂 Interactive JSON Tools

*   **Collapsible Data:** Fold arrays and objects to navigate large datasets easily.
*   **Smart Previews:** See summary info such as `Array(5)` or `{3 keys}` when blocks are collapsed.
*   **JSON Path Tools:** Inspect the current path and query large payloads quickly.
*   **Value Helpers:** Clickable URLs, timestamp tooltips, and Base64/JWT decoding are built into the viewer.

## 🛠️ Developer Toolkit

*   **Advanced Search:** Custom search bar (`Ctrl+F`) with result counts, navigation, and regex support.
*   **Go To Line:** Jump straight to specific lines (`Ctrl+G`) for faster debugging.
*   **Command Generation:** Generate copy-ready `cURL` and `fetch()` commands from the current page.
*   **Export Options:** Download content as Original, Formatted, Minified, CSV, or a cropped image when supported.
*   **HTTP Context Panel:** Inspect request and response details for the current resource.

## 🧭 Large-File Navigation

*   **Document Navigator:** Browse JSON, JavaScript, and XML/RSS structure from an outline view.
*   **Code Minimap:** Scan and jump through long files quickly with a syntax-aware minimap.
*   **Expand/Collapse Controls:** Manage deeply nested content without losing your place.
*   **Persistent View State:** Restore fold state, search text, highlighted line, and display mode for recently viewed files.

## ⚙️ Customizable & Privacy-First

*   **Themes:** Choose between Light, Dark, or Auto (syncs with system).
*   **Viewer Settings:** Adjust font size, indentation, line numbers, word wrap, minimap, toolbar, and file-type-specific behavior.
*   **Privacy First:** 100% client-side. Your code never leaves your browser.
*   **Local Metadata Only:** Request and response metadata used for HTTP context and command generation stays in your browser session.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl` + `B` | Toggle Raw/Pretty view |
| `Ctrl` + `Alt` + `C` | Copy to Clipboard |
| `Ctrl` + `F` | Open Search Toolbar |
| `Ctrl` + `G` | Go to Line |
| `Ctrl` + `Alt` + `T` | Toggle Toolbar |

## 📝 Note for Local Files

To use CodePrettify with local files (e.g., `file:///C:/code/data.json`), you must manually enable "Allow access to file URLs" in the Chrome Extensions management page.

## Supported Languages

Supports 14 interface languages including English, Norwegian, Swedish, Danish, German, French, Spanish, Italian, Portuguese, Russian, Chinese, Japanese, Korean, and Vietnamese.
