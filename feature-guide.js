function createFeatureScreenshotModal() {
  const modal = document.createElement("div");
  modal.className = "screenshot-modal";
  modal.id = "screenshot-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "screenshot-modal-title");
  modal.setAttribute("aria-describedby", "screenshot-modal-description screenshot-modal-instructions");
  modal.tabIndex = -1;
  modal.hidden = true;
  modal.innerHTML = `
    <figure class="screenshot-modal-content">
      <button class="screenshot-modal-nav screenshot-modal-prev" id="screenshot-modal-prev" type="button" aria-label="Previous screenshot">
        <span aria-hidden="true">‹</span>
      </button>
      <div class="screenshot-modal-image-wrap">
        <img id="screenshot-modal-image" alt="" />
        <button class="screenshot-modal-close" id="screenshot-modal-close" type="button" aria-label="Close screenshot viewer">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <button class="screenshot-modal-nav screenshot-modal-next" id="screenshot-modal-next" type="button" aria-label="Next screenshot">
        <span aria-hidden="true">›</span>
      </button>
      <figcaption class="screenshot-modal-caption" aria-live="polite" aria-atomic="true">
        <div class="screenshot-modal-caption-heading">
          <div class="screenshot-modal-caption-meta">
            <span class="screenshot-kicker" id="screenshot-modal-kicker">Product screenshot</span>
            <span class="screenshot-modal-counter" id="screenshot-modal-counter"></span>
          </div>
          <h4 id="screenshot-modal-title"></h4>
        </div>
        <p id="screenshot-modal-description"></p>
      </figcaption>
    </figure>
    <p class="sr-only" id="screenshot-modal-instructions">
      Use the left and right arrow keys to browse screenshots. Press Escape to close.
    </p>
  `;
  document.body.append(modal);
  return modal;
}

function initializeFeatureScreenshots() {
  const figures = Array.from(document.querySelectorAll(".feature-hero-shot, .feature-guide-shot"))
    .filter((figure) => figure.querySelector("img"));

  if (!figures.length) {
    return;
  }

  const screenshots = [];
  const triggerBindings = [];

  figures.forEach((figure) => {
    const image = figure.querySelector("img");
    const caption = figure.querySelector("figcaption");
    const trigger = document.createElement("button");
    const zoomLabel = document.createElement("span");
    const fullSource = image.currentSrc || image.src;

    trigger.type = "button";
    trigger.className = "feature-screenshot-open";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "screenshot-modal");
    trigger.setAttribute("aria-label", `Open full-size screenshot: ${image.alt}`);
    zoomLabel.className = "manual-screenshot-zoom";
    zoomLabel.setAttribute("aria-hidden", "true");
    zoomLabel.textContent = "View full size";

    image.before(trigger);
    trigger.append(image, zoomLabel);

    let screenshotIndex = screenshots.findIndex(({ image: existingSource }) => existingSource === fullSource);
    if (screenshotIndex === -1) {
      screenshotIndex = screenshots.length;
      screenshots.push({
        alt: image.alt,
        description: image.alt,
        image: fullSource,
        kicker: figure.classList.contains("feature-hero-shot") ? "Overview" : "Product screenshot",
        title: caption?.textContent.replace(/\s+/g, " ").trim() || image.alt,
      });
    }
    triggerBindings.push({ screenshotIndex, trigger });
  });

  const modal = createFeatureScreenshotModal();
  const modalImage = document.getElementById("screenshot-modal-image");
  const modalKicker = document.getElementById("screenshot-modal-kicker");
  const modalTitle = document.getElementById("screenshot-modal-title");
  const modalDescription = document.getElementById("screenshot-modal-description");
  const modalCounter = document.getElementById("screenshot-modal-counter");
  const modalClose = document.getElementById("screenshot-modal-close");
  const modalPrevious = document.getElementById("screenshot-modal-prev");
  const modalNext = document.getElementById("screenshot-modal-next");
  let activeIndex = 0;
  let returnFocus = null;

  const showScreenshot = (index) => {
    const screenshot = screenshots[index];
    if (!screenshot) return;

    activeIndex = index;
    modalImage.src = screenshot.image;
    modalImage.alt = screenshot.alt;
    modalKicker.textContent = screenshot.kicker;
    modalTitle.textContent = screenshot.title;
    modalDescription.textContent = screenshot.description;
    modalCounter.textContent = `${index + 1} / ${screenshots.length}`;
  };

  const openScreenshot = (index) => {
    returnFocus = document.activeElement;
    showScreenshot(index);
    modal.hidden = false;
    document.body.classList.add("screenshot-modal-open");
    modalClose.focus({ preventScroll: true });
  };

  const closeScreenshot = () => {
    if (modal.hidden) return;

    modal.hidden = true;
    document.body.classList.remove("screenshot-modal-open");
    if (returnFocus && typeof returnFocus.focus === "function") {
      returnFocus.focus({ preventScroll: true });
    }
    returnFocus = null;
  };

  const moveScreenshot = (offset) => {
    showScreenshot((activeIndex + offset + screenshots.length) % screenshots.length);
  };

  triggerBindings.forEach(({ screenshotIndex, trigger }) => {
    trigger.addEventListener("click", () => openScreenshot(screenshotIndex));
  });

  modalClose.addEventListener("click", closeScreenshot);
  modalPrevious.addEventListener("click", () => moveScreenshot(-1));
  modalNext.addEventListener("click", () => moveScreenshot(1));
  modalImage.addEventListener("click", closeScreenshot);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeScreenshot();
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeScreenshot();
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
    if (event.key !== "Tab") return;

    const focusable = [modalPrevious, modalClose, modalNext];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });
}

document.addEventListener("DOMContentLoaded", initializeFeatureScreenshots);
