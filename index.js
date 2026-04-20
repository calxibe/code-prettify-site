const screenshotData = [
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
    image: "img/feature-http-context.png",
    alt: "CodePrettify HTTP context panel showing URL, metadata, and timing details",
    kicker: "HTTP Context",
    title: "Inspect the resource behind the code",
    description:
      "See the request URL, content type, encoding, size details, and timing hints alongside the document you are viewing.",
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
    alt: "CodePrettify statistics and diagnostics modal showing warnings, data insights, and document metrics",
    kicker: "Diagnostics",
    title: "See document health and structure at a glance",
    description:
      "Open one panel for syntax status, payload warnings, CSV readiness, and file metrics before you export or compare.",
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
    image: "img/feature-http-context-dark.png",
    alt: "CodePrettify dark theme HTTP context panel showing response metadata and timing details",
    kicker: "Dark Theme",
    title: "Inspect API responses without getting blasted by light mode",
    description:
      "The same HTTP context workflow stays readable in dark theme, with the code view, modals, and minimap all adapting together.",
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
  const mainImg = document.getElementById("main-screenshot");
  const tabs = Array.from(document.querySelectorAll(".screenshot-tab"));
  const kicker = document.getElementById("screenshot-kicker");
  const title = document.getElementById("screenshot-title");
  const description = document.getElementById("screenshot-description");
  const trigger = document.getElementById("main-screenshot-trigger");
  const modal = document.getElementById("screenshot-modal");
  const modalImage = document.getElementById("screenshot-modal-image");
  const modalKicker = document.getElementById("screenshot-modal-kicker");
  const modalTitle = document.getElementById("screenshot-modal-title");
  const modalDescription = document.getElementById("screenshot-modal-description");

  if (!mainImg || !kicker || !title || !description || !trigger || !modal || !modalImage || !modalKicker || !modalTitle || !modalDescription || tabs.length === 0) {
    return;
  }

  let activeScreenshotIndex = 0;
  const screenshotMobileQuery = window.matchMedia("(max-width: 768px)");

  const updateScreenshot = (index) => {
    const selected = screenshotData[index];

    if (!selected) {
      return;
    }

    activeScreenshotIndex = index;
    mainImg.src = selected.image;
    mainImg.alt = selected.alt;
    kicker.textContent = selected.kicker;
    title.textContent = selected.title;
    description.textContent = selected.description;
    modalKicker.textContent = selected.kicker;
    modalTitle.textContent = selected.title;
    modalDescription.textContent = selected.description;
    trigger.setAttribute("aria-label", `Open screenshot preview: ${selected.title}`);

    tabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === index;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const openScreenshotModal = (index = activeScreenshotIndex) => {
    const selected = screenshotData[index];

    if (!selected) {
      return;
    }

    activeScreenshotIndex = index;
    modalImage.src = selected.image;
    modalImage.alt = selected.alt;
    modal.hidden = false;
    document.body.classList.add("screenshot-modal-open");
  };

  const closeScreenshotModal = () => {
    modal.hidden = true;
    document.body.classList.remove("screenshot-modal-open");
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      updateScreenshot(index);

      if (screenshotMobileQuery.matches) {
        openScreenshotModal(index);
      }
    });
  });

  trigger.addEventListener("click", () => {
    openScreenshotModal();
  });

  modalImage.addEventListener("click", () => {
    closeScreenshotModal();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeScreenshotModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeScreenshotModal();
    }
  });

  updateScreenshot(0);
}

function initializeSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.querySelector(anchor.getAttribute("href"));

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeScreenshotGallery();
  initializeSmoothScroll();
});