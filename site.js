const ANALYTICS_CONSENT_KEY = "codeprettify-analytics-consent";
const ANALYTICS_MEASUREMENT_ID = "G-S4WNQ48Q7F";
const ANALYTICS_SCRIPT_ID = "codeprettify-ga4";
const ANALYTICS_GRANTED = "granted";
const ANALYTICS_DENIED = "denied";
const CONSENT_STYLESHEET = "consent.css?v=20260826-2";

let analyticsSessionChoice = null;

function ensureConsentStylesheet() {
  if (document.querySelector('link[href^="consent.css"]')) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CONSENT_STYLESHEET;
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", resolve, { once: true });
    document.head.appendChild(link);
  });
}

function readAnalyticsChoice() {
  try {
    const choice = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return choice === ANALYTICS_GRANTED || choice === ANALYTICS_DENIED
      ? choice
      : analyticsSessionChoice;
  } catch {
    return analyticsSessionChoice;
  }
}

function writeAnalyticsChoice(choice) {
  analyticsSessionChoice = choice;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, choice);
  } catch {
    // The explicit choice still applies to this page when storage is unavailable.
  }
}

function removeAnalyticsCookies() {
  let cookieNames;
  try {
    cookieNames = document.cookie
      .split(";")
      .map((cookie) => cookie.split("=", 1)[0].trim())
      .filter((name) => /^_ga(?:_|$)/.test(name));
  } catch {
    return;
  }
  const hostname = window.location.hostname;
  const domains = hostname
    ? Array.from(new Set([hostname, `.${hostname}`]))
    : [];

  for (const name of cookieNames) {
    try {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}; SameSite=Lax`;
      }
    } catch {
      // Continue disabling Analytics even if the browser blocks cookie access.
    }
  }
}

function queueGoogleAnalyticsCommand() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(arguments);
}

function loadAnalytics() {
  if (readAnalyticsChoice() !== ANALYTICS_GRANTED) {
    return;
  }

  window[`ga-disable-${ANALYTICS_MEASUREMENT_ID}`] = false;
  window.gtag = window.gtag || queueGoogleAnalyticsCommand;
  window.gtag("consent", "default", {
    ad_personalization: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    analytics_storage: "granted",
  });
  window.gtag("js", new Date());
  window.gtag("config", ANALYTICS_MEASUREMENT_ID, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
  });

  if (document.getElementById(ANALYTICS_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = ANALYTICS_SCRIPT_ID;
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

function disableAnalytics() {
  window[`ga-disable-${ANALYTICS_MEASUREMENT_ID}`] = true;
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "denied",
    });
  }
  document.getElementById(ANALYTICS_SCRIPT_ID)?.remove();
  removeAnalyticsCookies();
}

function createAnalyticsConsentControls() {
  const panel = document.createElement("section");
  panel.id = "analytics-consent-panel";
  panel.className = "analytics-consent";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "analytics-consent-title");

  const heading = document.createElement("h2");
  heading.id = "analytics-consent-title";
  heading.tabIndex = -1;
  heading.textContent = "Optional website analytics";

  const description = document.createElement("p");
  description.append(
    "Google Analytics stays off unless you choose Allow analytics. Your choice is saved on this device and can be changed at any time. ",
  );
  const privacyLink = document.createElement("a");
  privacyLink.href = "privacy.html#website-analytics";
  privacyLink.textContent = "Read the privacy details";
  description.append(privacyLink, ".");

  const actions = document.createElement("div");
  actions.className = "analytics-consent-actions";

  const allowButton = document.createElement("button");
  allowButton.type = "button";
  allowButton.className = "btn btn-secondary analytics-consent-choice";
  allowButton.textContent = "Allow analytics";

  const rejectButton = document.createElement("button");
  rejectButton.type = "button";
  rejectButton.className = "btn btn-secondary analytics-consent-choice";
  rejectButton.textContent = "Reject analytics";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "analytics-consent-close";
  closeButton.textContent = "Keep current choice";

  const status = document.createElement("p");
  status.className = "sr-only";
  status.setAttribute("aria-live", "polite");

  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.className = "analytics-settings-button";
  settingsButton.setAttribute("aria-controls", "analytics-consent-panel");
  settingsButton.setAttribute("aria-expanded", "false");
  settingsButton.textContent = "Privacy settings";

  actions.append(allowButton, rejectButton, closeButton);
  panel.append(heading, description, actions);
  document.body.append(panel, settingsButton, status);

  const showPanel = (show) => {
    const hasChoice = readAnalyticsChoice() !== null;
    panel.hidden = !show;
    settingsButton.hidden = show || !hasChoice;
    settingsButton.setAttribute("aria-expanded", String(show));
    closeButton.hidden = !hasChoice;
  };

  allowButton.addEventListener("click", () => {
    writeAnalyticsChoice(ANALYTICS_GRANTED);
    loadAnalytics();
    status.textContent = "Optional analytics allowed.";
    showPanel(false);
    settingsButton.focus();
  });

  rejectButton.addEventListener("click", () => {
    writeAnalyticsChoice(ANALYTICS_DENIED);
    disableAnalytics();
    status.textContent = "Optional analytics rejected and any analytics cookies were removed.";
    showPanel(false);
    settingsButton.focus();
  });

  closeButton.addEventListener("click", () => {
    showPanel(false);
    settingsButton.focus();
  });

  settingsButton.addEventListener("click", () => {
    showPanel(true);
    heading.focus();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== ANALYTICS_CONSENT_KEY) {
      return;
    }
    analyticsSessionChoice = null;
    if (event.newValue === ANALYTICS_GRANTED) {
      loadAnalytics();
    } else {
      disableAnalytics();
    }
    showPanel(event.newValue !== ANALYTICS_GRANTED && event.newValue !== ANALYTICS_DENIED);
  });

  const choice = readAnalyticsChoice();
  if (choice === ANALYTICS_GRANTED) {
    loadAnalytics();
  } else {
    disableAnalytics();
  }
  showPanel(choice === null);
}

function initializeExternalLinkSafety() {
  for (const link of document.querySelectorAll('a[target="_blank"]')) {
    link.relList.add("noopener", "noreferrer");
  }
}

function initializeScrollableCodeAccessibility() {
  const codeBlocks = Array.from(document.querySelectorAll("pre.feature-code"));
  const updateTabStops = () => {
    for (const codeBlock of codeBlocks) {
      const isScrollable = codeBlock.scrollWidth > codeBlock.clientWidth + 1;
      if (isScrollable) {
        codeBlock.tabIndex = 0;
        codeBlock.dataset.keyboardScrollable = "true";
      } else if (codeBlock.dataset.keyboardScrollable === "true") {
        codeBlock.removeAttribute("tabindex");
        delete codeBlock.dataset.keyboardScrollable;
      }
    }
  };

  updateTabStops();
  window.addEventListener("resize", updateTabStops);
}

function initializeMenuToggle() {
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("header nav");

  if (!menuToggle || !nav) {
    return;
  }

  const setMenuOpen = (isOpen, { restoreFocus = false } = {}) => {
    menuToggle.classList.toggle("active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation",
    );
    nav.classList.toggle("open", isOpen);

    if (restoreFocus) {
      menuToggle.focus();
    }
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      menuToggle.getAttribute("aria-expanded") === "true"
      && !nav.contains(event.target)
      && !menuToggle.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape"
      && menuToggle.getAttribute("aria-expanded") === "true"
    ) {
      setMenuOpen(false, { restoreFocus: true });
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 769px)").matches) {
      setMenuOpen(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await ensureConsentStylesheet();
  createAnalyticsConsentControls();
  initializeExternalLinkSafety();
  initializeScrollableCodeAccessibility();
  initializeMenuToggle();
});
