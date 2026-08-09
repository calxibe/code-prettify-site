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

const ANALYTICS_CONSENT_KEY = "codeprettify-analytics-consent";

function readAnalyticsConsent() {
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function clearGoogleAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0].trim())
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));

  for (const name of cookieNames) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.prettify.cloud; SameSite=Lax`;
  }
}

function initializeAnalyticsConsent() {
  const banner = document.createElement("section");
  banner.className = "analytics-consent";
  banner.hidden = true;
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-modal", "false");
  banner.setAttribute("aria-labelledby", "analytics-consent-title");
  banner.setAttribute("aria-describedby", "analytics-consent-description");
  banner.innerHTML = `
    <div class="analytics-consent-copy">
      <strong id="analytics-consent-title">Optional website analytics</strong>
      <p id="analytics-consent-description">We use Google Analytics to understand which pages are useful. It stays off unless you allow it. <a href="privacy.html#website-analytics">Privacy details</a></p>
    </div>
    <div class="analytics-consent-actions">
      <button type="button" class="analytics-consent-button" data-analytics-consent="denied">Reject analytics</button>
      <button type="button" class="analytics-consent-button" data-analytics-consent="granted">Allow analytics</button>
    </div>
  `;
  document.body.appendChild(banner);

  const footerLinks = document.querySelector(".footer-links");
  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.className = "cookie-settings-link";
  settingsButton.textContent = "Cookie settings";
  settingsButton.setAttribute("aria-haspopup", "dialog");
  footerLinks?.appendChild(settingsButton);

  const hideBanner = () => {
    banner.hidden = true;
  };

  const showBanner = ({ focus = false } = {}) => {
    banner.hidden = false;
    if (focus) {
      window.requestAnimationFrame(() => banner.querySelector("button")?.focus());
    }
  };

  const saveConsent = (value) => {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
    } catch {
      // The choice still applies to this page if storage is unavailable.
    }
  };

  settingsButton.addEventListener("click", () => showBanner({ focus: true }));

  banner.addEventListener("click", (event) => {
    const button = event.target.closest("[data-analytics-consent]");
    if (!button) return;

    const value = button.dataset.analyticsConsent;
    const previousValue = readAnalyticsConsent();
    saveConsent(value);

    if (value === "granted") {
      window.cpLoadAnalytics?.();
      hideBanner();
      settingsButton.focus();
      return;
    }

    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", { analytics_storage: "denied" });
    }
    clearGoogleAnalyticsCookies();

    if (previousValue === "granted" && window.cpAnalyticsLoaded) {
      window.location.reload();
      return;
    }

    hideBanner();
    settingsButton.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !banner.hidden && readAnalyticsConsent()) {
      hideBanner();
      settingsButton.focus();
    }
  });

  if (!readAnalyticsConsent()) {
    showBanner();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeMenuToggle();
  initializeAnalyticsConsent();
});
