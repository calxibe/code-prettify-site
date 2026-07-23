const screenshotData = [
  {
    image: "img/feature-json-format.png",
    alt: "CodePrettify formatting a structured JSON API response with nested services, metrics, links, arrays, and syntax highlighting",
    kicker: "JSON",
    title: "Make complex JSON payloads easy to scan",
    description:
      "Pretty indentation, syntax coloring, folding, clickable links, timestamp hints, and inline helpers turn dense API responses into a readable workspace.",
  },
  {
    image: "img/feature-json-to-code.png",
    alt: "CodePrettify JSON to Code Generator showing a deployment-event JSON sample beside generated TypeScript interfaces",
    kicker: "JSON to Code",
    title: "Generate typed models directly from real JSON samples",
    description:
      "Infer nested TypeScript, Zod, C#, Java, Kotlin, Pydantic, Go, Rust, Swift, Dart, or JSON Schema output locally, then copy, export, or open it as a document.",
  },
  {
    image: "img/feature-workbench-repair.png",
    alt: "CodePrettify JSON Repair and Transform repair tab showing messy input, a repair report, and clean JSON output",
    kicker: "JSON repair",
    title: "Recover useful data from copied, logged, or hand-edited payloads",
    description:
      "Remove fences and surrounding prose, repair common JSON-like syntax problems, and review every change before continuing with the clean result.",
  },
  {
    image: "img/feature-workbench-transform.png",
    alt: "CodePrettify JSON Repair and Transform tab showing a filter and sort recipe beside its live JSON result",
    kicker: "JSON transform",
    title: "Build a transformation recipe with a live result",
    description:
      "Filter, select, rename, sort, flatten, group, aggregate, or limit structured rows in an ordered pipeline without changing the original document.",
  },
  {
    image: "img/feature-data-converter-utilities.png",
    alt: "CodePrettify Data Converter with Hash and HMAC selected and populated hexadecimal and Base64 SHA-256 output",
    kicker: "Data Converter",
    title: "Convert, hash, and generate in one focused workspace",
    description:
      "Convert structured or encoded text, create SHA-256, SHA-384, SHA-512, or HMAC output, convert Unix and ISO timestamps, and generate secure UUID or ULID values.",
  },
  {
    image: "img/feature-security-scan.png",
    alt: "CodePrettify Security Scan showing masked secret findings and detected API endpoints from the current JavaScript file",
    kicker: "Security Scan",
    title: "Surface secrets and endpoints before code leaves your screen",
    description:
      "Scan the current document locally for credential-shaped values, URLs, files, and API routes, then jump to the exact source line that needs review.",
  },
  {
    image: "img/feature-js-transform.png",
    alt: "CodePrettify before and after view showing a minified JavaScript bundle transformed into readable formatted code",
    kicker: "JavaScript",
    title: "Show the jump from compressed bundles to readable code",
    description:
      "Capture the same minified JavaScript file in raw mode and prettified mode so visitors can immediately see what the extension cleans up.",
  },
  {
    image: "img/feature-js-playground.png",
    alt: "CodePrettify JavaScript Playground modal running code against a minified admin bundle, with console output and a return value captured in a sandboxed Web Worker",
    kicker: "Playground",
    title: "Prototype and debug JavaScript against the file you are viewing",
    description:
      "A sandboxed Playground runs your code in an isolated Web Worker, captures console output (including console.table), and can pull the current document into scope so you can call its top-level functions directly.",
  },
  {
    image: "img/feature-markdown.png",
    alt: "CodePrettify rendered Markdown document showing headings, task lists, tables, links, and code fences",
    kicker: "Markdown",
    title: "Read Markdown files as clean formatted documents",
    description:
      "Open local or remote Markdown files and get a rendered document view while keeping the same search, copy, diff, diagnostics, and export tools nearby.",
  },
  {
    image: "img/feature-http-client.png",
    alt: "CodePrettify HTTP Client modal showing a request composer, saved request rail, and JSON response preview",
    kicker: "HTTP Client",
    title: "Build, replay, and save requests without leaving the tab",
    description:
      "Import cURL, reuse saved requests and environments, and inspect the response body, headers, cookies, or raw output in the same workspace.",
  },
  {
    image: "img/feature-diff-view.png",
    alt: "CodePrettify diff view comparing clipboard content with the current document",
    kicker: "Diff View",
    title: "Compare changes without leaving the page",
    description:
      "Open a side-by-side diff, track added and removed lines, and swap sides when you need to reverse the comparison.",
  },
  {
    image: "img/feature-table-view.png",
    alt: "CodePrettify table view showing structured JSON data as a searchable table",
    kicker: "Table View",
    title: "Turn structured payloads into a searchable grid",
    description:
      "Explore JSON arrays and XML or RSS data as sortable tables with search, filters, and quick scanning.",
  },
  {
    image: "img/feature-stats-diagnostics.png",
    alt: "CodePrettify statistics and diagnostics modal showing warnings, request metadata, data insights, and document metrics",
    kicker: "Diagnostics",
    title: "See document health and request details at a glance",
    description:
      "Open one panel for syntax status, payload warnings, request metadata, CSV readiness, and file metrics before you export or compare.",
  },
  {
    image: "img/feature-settings.png",
    alt: "CodePrettify settings modal showing theme, language, and file-type options",
    kicker: "Settings",
    title: "Tune the viewer for each file type",
    description:
      "Choose theme and language, adjust typography, and control behavior like wrapping, minimap, and per-file-type features.",
  },
  {
    image: "img/feature-diff-view-dark.png",
    alt: "CodePrettify dark theme diff view comparing clipboard content with the current document",
    kicker: "Dark Theme",
    title: "Review diffs comfortably during long sessions",
    description:
      "Dark mode keeps additions, removals, and synchronized panes easy to scan when you are comparing larger payloads late in the day.",
  },
  {
    image: "img/feature-regex-playground.png",
    alt: "CodePrettify Regex Playground modal showing live match highlighting, capture groups, and a built-in regex guide panel",
    kicker: "Regex",
    title: "Test patterns live against the file you are viewing",
    description:
      "The Regex Playground highlights every match in the viewer, shows capture groups for the active match, and includes a built-in guide with quick examples you can load with one click.",
  },
];

function initializeScreenshotGallery() {
  const tabs = Array.from(document.querySelectorAll(".screenshot-tab"));
  const modal = document.getElementById("screenshot-modal");
  const modalImage = document.getElementById("screenshot-modal-image");
  const modalKicker = document.getElementById("screenshot-modal-kicker");
  const modalTitle = document.getElementById("screenshot-modal-title");
  const modalDescription = document.getElementById("screenshot-modal-description");
  const modalCounter = document.getElementById("screenshot-modal-counter");
  const modalClose = document.getElementById("screenshot-modal-close");
  const modalPrevious = document.getElementById("screenshot-modal-prev");
  const modalNext = document.getElementById("screenshot-modal-next");

  if (!modal || !modalImage || !modalKicker || !modalTitle || !modalDescription || !modalCounter || !modalClose || !modalPrevious || !modalNext || tabs.length === 0) {
    return;
  }

  let activeScreenshotIndex = 0;
  let modalReturnFocus = null;

  const showScreenshot = (index) => {
    const selected = screenshotData[index];

    if (!selected) {
      return;
    }

    activeScreenshotIndex = index;
    modalImage.src = selected.image;
    modalImage.alt = selected.alt;
    modalKicker.textContent = selected.kicker;
    modalTitle.textContent = selected.title;
    modalDescription.textContent = selected.description;
    modalCounter.textContent = `${index + 1} / ${screenshotData.length}`;

    tabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === index;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const openScreenshotModal = (index) => {
    modalReturnFocus = document.activeElement;
    showScreenshot(index);
    modal.hidden = false;
    document.body.classList.add("screenshot-modal-open");
    modalClose.focus({ preventScroll: true });
  };

  const closeScreenshotModal = () => {
    modal.hidden = true;
    document.body.classList.remove("screenshot-modal-open");
    if (modalReturnFocus && typeof modalReturnFocus.focus === "function") {
      modalReturnFocus.focus();
    }
    modalReturnFocus = null;
  };

  const moveScreenshot = (offset) => {
    const nextIndex = (activeScreenshotIndex + offset + screenshotData.length) % screenshotData.length;
    showScreenshot(nextIndex);
  };

  tabs.forEach((tab, index) => {
    const selected = screenshotData[index];
    tab.setAttribute("aria-haspopup", "dialog");
    tab.setAttribute("aria-pressed", "false");
    if (selected) {
      tab.setAttribute("aria-label", `Open screenshot: ${selected.title}`);
    }

    tab.addEventListener("click", () => {
      openScreenshotModal(index);
    });
  });

  modalClose.addEventListener("click", closeScreenshotModal);
  modalPrevious.addEventListener("click", () => {
    moveScreenshot(-1);
  });
  modalNext.addEventListener("click", () => {
    moveScreenshot(1);
  });
  modalImage.addEventListener("click", closeScreenshotModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeScreenshotModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeScreenshotModal();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveScreenshot(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveScreenshot(1);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = [modalPrevious, modalClose, modalNext];
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus({ preventScroll: true });
    }
  });
}

function initializeSmoothScroll() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.querySelector(anchor.getAttribute("href"));

      if (target) {
        target.scrollIntoView({
          behavior: prefersReducedMotion.matches ? "auto" : "smooth",
          block: "start",
        });
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeScreenshotGallery();
  initializeSmoothScroll();
});
