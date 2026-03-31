const CODEPRETTIFY_ANALYTICS_ID = "G-S4WNQ48Q7F";
const CODEPRETTIFY_ANALYTICS_SCRIPT_ID = "codeprettify-analytics-script";
const CODEPRETTIFY_CONSENT_KEY = "codeprettifyCookieConsent";
const CODEPRETTIFY_CONSENT_ACCEPTED = "accepted";
const CODEPRETTIFY_CONSENT_DECLINED = "declined";

let codePrettifyAnalyticsInitialized = false;
let codePrettifyConsentBanner = null;

function readCodePrettifyConsent() {
  try {
    const rawValue = window.localStorage.getItem(CODEPRETTIFY_CONSENT_KEY);

    if (!rawValue) {
      return null;
    }

    if (
      rawValue === CODEPRETTIFY_CONSENT_ACCEPTED ||
      rawValue === CODEPRETTIFY_CONSENT_DECLINED
    ) {
      return rawValue;
    }

    const parsedValue = JSON.parse(rawValue);

    if (
      parsedValue &&
      (parsedValue.status === CODEPRETTIFY_CONSENT_ACCEPTED ||
        parsedValue.status === CODEPRETTIFY_CONSENT_DECLINED)
    ) {
      return parsedValue.status;
    }
  } catch (error) {
    return null;
  }

  return null;
}

function writeCodePrettifyConsent(status) {
  try {
    window.localStorage.setItem(
      CODEPRETTIFY_CONSENT_KEY,
      JSON.stringify({
        status,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    return false;
  }

  return true;
}

function getCookieDomainsForRemoval() {
  const hostName = window.location.hostname;
  const hostParts = hostName.split(".").filter(Boolean);
  const domains = new Set([hostName]);

  if (hostParts.length >= 2) {
    domains.add(`.${hostParts.slice(-2).join(".")}`);
  }

  return ["", ...domains];
}

function clearAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(
      (cookieName) =>
        /^_ga($|_)/.test(cookieName) ||
        /^_gid$/.test(cookieName) ||
        /^_gat($|_)/.test(cookieName)
    );

  getCookieDomainsForRemoval().forEach((domain) => {
    cookieNames.forEach((cookieName) => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${
        domain ? `; domain=${domain}` : ""
      }`;
    });
  });
}

function disableAnalyticsTracking() {
  window[`ga-disable-${CODEPRETTIFY_ANALYTICS_ID}`] = true;

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }

  clearAnalyticsCookies();
}

function loadAnalyticsTracking() {
  window[`ga-disable-${CODEPRETTIFY_ANALYTICS_ID}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  if (!document.getElementById(CODEPRETTIFY_ANALYTICS_SCRIPT_ID)) {
    const analyticsScript = document.createElement("script");
    analyticsScript.async = true;
    analyticsScript.id = CODEPRETTIFY_ANALYTICS_SCRIPT_ID;
    analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${CODEPRETTIFY_ANALYTICS_ID}`;
    document.head.appendChild(analyticsScript);
  }

  if (codePrettifyAnalyticsInitialized) {
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    return;
  }

  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", CODEPRETTIFY_ANALYTICS_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  codePrettifyAnalyticsInitialized = true;
}

function initializeAnalyticsFromConsent() {
  const consentStatus = readCodePrettifyConsent();

  if (consentStatus === CODEPRETTIFY_CONSENT_ACCEPTED) {
    loadAnalyticsTracking();
    return;
  }

  disableAnalyticsTracking();
}

function initializeMenuToggle() {
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("header nav");

  if (!menuToggle || !nav) {
    return;
  }

  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    menuToggle.setAttribute("aria-expanded", menuToggle.classList.contains("active"));
    nav.classList.toggle("open");
  });
}

function ensureConsentBanner() {
  if (codePrettifyConsentBanner) {
    return codePrettifyConsentBanner;
  }

  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.hidden = true;
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-live", "polite");
  banner.setAttribute("aria-labelledby", "cookie-banner-title");
  banner.innerHTML = `
    <div class="cookie-banner-inner">
      <div class="cookie-banner-copy">
        <span class="section-badge">Cookie Settings</span>
        <h3 id="cookie-banner-title">Allow optional analytics?</h3>
        <p>
          We only load Google Analytics if you opt in. Your choice is saved in
          localStorage on this browser, and declining keeps analytics off. See
          the <a href="privacy.html">privacy policy</a> for details.
        </p>
        <p class="cookie-banner-status" id="cookie-banner-status"></p>
      </div>
      <div class="cookie-banner-actions">
        <button type="button" class="btn btn-secondary" data-cookie-action="decline">
          Decline analytics
        </button>
        <button type="button" class="btn btn-primary" data-cookie-action="accept">
          Accept analytics
        </button>
      </div>
    </div>
  `;

  banner
    .querySelector('[data-cookie-action="accept"]')
    .addEventListener("click", () => {
      writeCodePrettifyConsent(CODEPRETTIFY_CONSENT_ACCEPTED);
      loadAnalyticsTracking();
      hideConsentBanner();
    });

  banner
    .querySelector('[data-cookie-action="decline"]')
    .addEventListener("click", () => {
      writeCodePrettifyConsent(CODEPRETTIFY_CONSENT_DECLINED);
      disableAnalyticsTracking();
      hideConsentBanner();
    });

  document.body.appendChild(banner);
  codePrettifyConsentBanner = banner;

  return banner;
}

function updateConsentBannerStatus() {
  const banner = ensureConsentBanner();
  const statusElement = banner.querySelector("#cookie-banner-status");
  const consentStatus = readCodePrettifyConsent();

  if (!statusElement) {
    return;
  }

  if (consentStatus === CODEPRETTIFY_CONSENT_ACCEPTED) {
    statusElement.textContent = "Saved choice: analytics enabled.";
    return;
  }

  if (consentStatus === CODEPRETTIFY_CONSENT_DECLINED) {
    statusElement.textContent = "Saved choice: analytics disabled.";
    return;
  }

  statusElement.textContent = "No saved analytics choice yet.";
}

function showConsentBanner() {
  const banner = ensureConsentBanner();
  updateConsentBannerStatus();
  banner.hidden = false;
  document.body.classList.add("cookie-banner-visible");
}

function hideConsentBanner() {
  const banner = ensureConsentBanner();
  banner.hidden = true;
  document.body.classList.remove("cookie-banner-visible");
}

function initializeCookieSettingsButtons() {
  document.querySelectorAll("[data-cookie-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      showConsentBanner();
    });
  });
}

function initializeCookieConsent() {
  initializeCookieSettingsButtons();

  if (!readCodePrettifyConsent()) {
    showConsentBanner();
  }
}

initializeAnalyticsFromConsent();

document.addEventListener("DOMContentLoaded", () => {
  initializeMenuToggle();
  initializeCookieConsent();
});