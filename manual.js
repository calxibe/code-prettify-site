function initializeManualFilters() {
  const searchInput = document.getElementById("manual-search");
  const searchStatus = document.getElementById("manual-search-status");
  const noResults = document.getElementById("manual-no-results");
  const clearButton = document.getElementById("manual-clear-search");
  const filterButtons = Array.from(document.querySelectorAll(".manual-filter"));
  const topics = Array.from(document.querySelectorAll(".manual-topic"));
  const tocLinks = Array.from(document.querySelectorAll(".manual-toc a[href^='#']"));

  if (!searchInput || !searchStatus || !noResults || !clearButton || !filterButtons.length || !topics.length) {
    return;
  }

  let activeProduct = "all";
  const searchableText = new Map(
    topics.map((topic) => [topic, topic.textContent.toLocaleLowerCase()]),
  );

  const updateFilters = () => {
    const query = searchInput.value.trim().toLocaleLowerCase();
    let visibleCount = 0;

    topics.forEach((topic) => {
      const products = (topic.dataset.products || "shared").split(/\s+/);
      const matchesProduct = activeProduct === "all"
        || products.includes("shared")
        || products.includes(activeProduct);
      const matchesQuery = !query || searchableText.get(topic).includes(query);
      const isVisible = matchesProduct && matchesQuery;

      topic.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    tocLinks.forEach((link) => {
      const topic = document.querySelector(link.getAttribute("href"));
      link.hidden = !topic || topic.hidden;
    });

    noResults.hidden = visibleCount !== 0;
    if (!query && activeProduct === "all") {
      searchStatus.textContent = "Showing the complete manual.";
    } else {
      const productLabel = activeProduct === "browser"
        ? "browser extension"
        : activeProduct === "app"
          ? "Windows app"
          : "all products";
      searchStatus.textContent = `${visibleCount} ${visibleCount === 1 ? "section" : "sections"} shown for ${productLabel}${query ? ` matching “${searchInput.value.trim()}”` : ""}.`;
    }
  };

  const selectProduct = (product) => {
    activeProduct = product;
    filterButtons.forEach((button) => {
      const isActive = button.dataset.product === product;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    updateFilters();
  };

  searchInput.addEventListener("input", updateFilters);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchInput.value) {
      searchInput.value = "";
      updateFilters();
    }
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => selectProduct(button.dataset.product || "all"));
  });

  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    selectProduct("all");
    searchInput.focus();
  });

  updateFilters();
}

function initializeManualContentsToggle() {
  const toggle = document.getElementById("manual-toc-toggle");
  const contents = document.getElementById("manual-toc");
  const stateLabel = toggle?.querySelector(".manual-toc-toggle-state");

  if (!toggle || !contents || !stateLabel) return;

  const compactLayout = window.matchMedia("(max-width: 1000px)");
  const setOpen = (isOpen) => {
    const shouldHide = compactLayout.matches && !isOpen;
    contents.hidden = shouldHide;
    toggle.setAttribute("aria-expanded", String(!shouldHide));
    stateLabel.textContent = shouldHide ? "Show sections" : "Hide sections";
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  contents.addEventListener("click", (event) => {
    if (compactLayout.matches && event.target.closest("a")) {
      setOpen(false);
    }
  });

  compactLayout.addEventListener("change", () => setOpen(!compactLayout.matches));
  setOpen(!compactLayout.matches);
}

function initializeManualScreenshotDialog() {
  const modal = document.getElementById("manual-screenshot-modal");
  const modalImage = document.getElementById("manual-screenshot-modal-image");
  const triggers = Array.from(document.querySelectorAll(".manual-screenshot-open"));

  if (!modal || !modalImage || !triggers.length) {
    return;
  }

  let returnFocus = null;

  const openScreenshot = (trigger) => {
    const fullSource = trigger.dataset.fullSrc;
    const thumbnail = trigger.querySelector("img");

    if (!fullSource || !thumbnail) return;

    modalImage.src = fullSource;
    modalImage.alt = thumbnail.alt;
    modal.setAttribute("aria-label", `${trigger.dataset.title || "Full-size screenshot"}. Click anywhere or press Escape to close.`);
    returnFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("screenshot-modal-open");
    modal.focus({ preventScroll: true });
  };

  const closeScreenshot = () => {
    if (modal.hidden) return;

    modal.hidden = true;
    document.body.classList.remove("screenshot-modal-open");
    if (returnFocus && typeof returnFocus.focus === "function") {
      returnFocus.focus();
    }
    returnFocus = null;
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => openScreenshot(trigger));
  });

  modal.addEventListener("click", closeScreenshot);

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeScreenshot();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      modal.focus({ preventScroll: true });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeManualFilters();
  initializeManualContentsToggle();
  initializeManualScreenshotDialog();
});
