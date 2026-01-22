# CodePrettify

Transform raw code into a readable, beautiful workspace.

CodePrettify automatically formats, validates, and highlights raw JavaScript, JSON, and CSS files the moment you open them. Whether you are viewing a minified API response or a local config file, get an IDE-like experience directly in your browser.

## 🚀 Smart Automation

*   **Auto-Format:** Automatically detects messily formatted code and beautifies it with your preferred indentation.
*   **Intelligent Minification Detection:** The extension analyzes code density. If a file is minified, it formats it automatically. If it’s already clean, it simply adds syntax highlighting.
*   **Local File Support:** Works seamlessly on web URLs and local files (`file://`) opened in the browser.

## 🛡️ Syntax Validation & Error Checking

Don't just read code—debug it. CodePrettify scans your files for common errors:

*   **JSON:** Detects syntax errors and provides the exact line number.
*   **JavaScript:** Identifies mismatched braces, brackets, and common typos (e.g., `functon` instead of `function`).
*   **CSS:** Validates structural integrity.

> **Instant Feedback:** Invalid code triggers a non-intrusive toast notification with error details.

## 📂 Interactive JSON Viewer

*   **Collapsible Data:** Fold arrays and objects to navigate large datasets easily.
*   **Smart Previews:** See summary info (e.g., `Array(5)` or `{3 keys}`) when blocks are collapsed.
*   **Clickable Links:** URLs inside JSON strings automatically become clickable hyperlinks.
*   **Expand/Collapse All:** Dedicated buttons to manage massive JSON files instantly.

## 🛠️ Powerful Toolkit

*   **Advanced Search:** Custom search bar (`Ctrl+F`) with result counting and navigation—works even on huge files where browser find-in-page fails.
*   **Go To Line:** Jump straight to specific lines (`Ctrl+G`), perfect for debugging stack traces.
*   **Export Options:** Download your file in three formats: Original, Formatted, or Minified.
*   **Zero-Flash Loading:** Engineered to prevent the raw text from "flashing" before the beautifier loads.

## ⚙️ Fully Customizable

*   **Themes:** Choose between Light, Dark, or Auto (syncs with system).
*   **Format Settings:** Adjustable font size (10-24px), indentation (2 or 4 spaces), and line numbers.
*   **Privacy First:** 100% Client-side. Your code never leaves your browser.

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

Supports 14 languages including English, Norwegian, German, Spanish, and Chinese.
