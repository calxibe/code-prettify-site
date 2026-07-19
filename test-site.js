const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const SITE_ROOT = __dirname;
const PAGES = ["index.html", "pricing.html", "manual.html", "privacy.html", "changelog.html", "changelog-app.html"];
const INSTALL_URLS = [
  "https://chromewebstore.google.com/detail/codeprettify-js-json-css/ijhgclhipdfnaphhcipbnblgoemcaioj",
  "https://microsoftedge.microsoft.com/addons/detail/codeprettify-js-json-c/ckmnkbdicbcbajedhngfaamomlgpgchc",
  "https://apps.microsoft.com/detail/9p0lp3pt6j7d",
];
const REQUIRED_MANUAL_TOPICS = [
  "getting-started", "supported-formats", "workspace", "browser-workflows", "app-files-tabs",
  "app-menus", "search-navigation", "format-behavior", "json-tools", "table-view",
  "schema-validator", "analysis-tools", "data-converter", "copy-export", "compare",
  "javascript-playground", "runtime-inspector", "regex-playground", "http-client", "settings",
  "large-files-encoding", "shortcuts", "privacy-security", "troubleshooting",
];
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createServer() {
  return http.createServer((request, response) => {
    const requestedPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
    const resolvedPath = path.resolve(SITE_ROOT, relativePath);

    if (!resolvedPath.startsWith(`${path.resolve(SITE_ROOT)}${path.sep}`) && resolvedPath !== path.resolve(SITE_ROOT, "index.html")) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    fs.readFile(resolvedPath, (error, content) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.code === "ENOENT" ? "Not found" : "Server error");
        return;
      }
      response.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(resolvedPath)] || "application/octet-stream" });
      response.end(content);
    });
  });
}

async function checkPageStructure(page, baseUrl, pageName) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/${pageName}`, { waitUntil: "domcontentloaded" });

  const structure = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("[id]"), (element) => element.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    const headerLinks = Array.from(document.querySelectorAll("header nav a"), (link) => ({
      href: link.getAttribute("href"),
      text: link.textContent.trim(),
    }));
    const footerLinks = Array.from(document.querySelectorAll("footer a"), (link) => link.getAttribute("href"));
    const missingFragments = Array.from(document.querySelectorAll('a[href^="#"]'))
      .map((link) => link.getAttribute("href"))
      .filter((href) => href.length > 1 && !document.querySelector(href));
    return {
      duplicates,
      footerLinks,
      hasMainTarget: Boolean(document.getElementById("main-content")),
      hasManualHeader: headerLinks.some((link) => link.href === "manual.html" && link.text === "Manual"),
      hasPriceHeader: headerLinks.some((link) => link.href === "pricing.html" && link.text === "Price"),
      hasPrivacyHeader: headerLinks.some((link) => link.href === "privacy.html"),
      missingFragments,
    };
  });

  assert(structure.duplicates.length === 0, `${pageName} has duplicate IDs: ${structure.duplicates.join(", ")}`);
  assert(structure.missingFragments.length === 0, `${pageName} has missing fragment targets: ${structure.missingFragments.join(", ")}`);
  assert(structure.hasMainTarget, `${pageName} is missing #main-content`);
  assert(structure.hasManualHeader, `${pageName} header is missing Manual`);
  assert(structure.hasPriceHeader, `${pageName} header is missing Price`);
  assert(!structure.hasPrivacyHeader, `${pageName} still has Privacy in its header`);
  assert(structure.footerLinks.includes("pricing.html"), `${pageName} footer is missing Pricing`);
  assert(structure.footerLinks.includes("manual.html"), `${pageName} footer is missing Manual`);
  assert(structure.footerLinks.includes("privacy.html"), `${pageName} footer is missing Privacy`);
  assert(errors.length === 0, `${pageName} raised JavaScript errors: ${errors.join(" | ")}`);
}

async function checkInternalLinks(page, baseUrl) {
  for (const pageName of PAGES) {
    await page.goto(`${baseUrl}/${pageName}`, { waitUntil: "domcontentloaded" });
    const links = await page.evaluate(() => Array.from(document.querySelectorAll("a[href]"), (link) => link.getAttribute("href")));
    for (const href of links) {
      if (!href || /^(?:https?:|mailto:|#)/i.test(href)) continue;
      const [filePart, fragment] = href.split("#");
      const targetFile = filePart || pageName;
      assert(fs.existsSync(path.join(SITE_ROOT, targetFile)), `${pageName} links to missing file ${targetFile}`);
      if (fragment) {
        const targetHtml = fs.readFileSync(path.join(SITE_ROOT, targetFile), "utf8");
        assert(new RegExp(`\\bid=["']${fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(targetHtml), `${pageName} links to missing target ${href}`);
      }
    }
  }
}

async function checkResponsiveLayout(page, baseUrl) {
  for (const width of [320, 375, 768, 769, 800]) {
    await page.setViewportSize({ width, height: 900 });
    for (const pageName of PAGES) {
      await page.goto(`${baseUrl}/${pageName}`, { waitUntil: "domcontentloaded" });
      const dimensions = await page.evaluate(() => ({
        body: document.body.scrollWidth,
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      assert(dimensions.body <= dimensions.viewport && dimensions.document <= dimensions.viewport, `${pageName} overflows at ${width}px (${dimensions.body}/${dimensions.document} > ${dimensions.viewport})`);
    }
  }
}

async function checkPricingPage(page, baseUrl) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/pricing.html`, { waitUntil: "domcontentloaded" });
  const pricing = await page.evaluate((expectedInstallUrls) => {
    const installLinks = Array.from(document.querySelectorAll(".pricing-install-link"), (link) => ({
      href: link.href,
      rel: link.rel.split(/\s+/),
      target: link.target,
    }));
    const bodyText = document.body.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    const table = document.querySelector(".comparison-table");
    const comparisonValues = Array.from(table?.querySelectorAll("tbody td.comparison-value") || []);
    const comparisonDataCells = Array.from(table?.querySelectorAll("tbody td") || []);
    const comparisonHeaders = Array.from(table?.querySelectorAll("thead th[scope='col']") || [], (cell) => cell.textContent.trim());
    const comparisonRows = Array.from(table?.querySelectorAll("tbody tr") || []).map((row) => ({
      label: row.querySelector("th[scope='row']")?.textContent.trim() || "",
      cells: Array.from(row.querySelectorAll("td"), (cell) => ({
        yes: cell.classList.contains("comparison-value-yes"),
        no: cell.classList.contains("comparison-value-no"),
      })),
    }));
    const codePrettifyOnlyRows = [
      "Semantic data diff",
      "Document security scan",
      "Sandboxed JavaScript playground",
    ];
    const jsonCrackExpectedStatuses = new Map([
      ["Free option", true],
      ["Browser auto-formatting", false],
      ["Interactive graph view", true],
      ["Native desktop app", false],
      ["Multi-format viewing", true],
      ["Data conversion", true],
      ["Regex tools", false],
      ["Semantic data diff", false],
      ["Document security scan", false],
      ["Sandboxed JavaScript playground", false],
      ["HTTP client", false],
      ["Local/offline workflow", true],
      ["Account-free use", true],
      ["Very large JSON focus", false],
      ["Cross-platform desktop", false],
    ]);
    return {
      activePriceLink: Boolean(document.querySelector('header a[href="pricing.html"][aria-current="page"]')),
      allInstallUrlsPresent: expectedInstallUrls.every((url) => installLinks.some((link) => link.href === url)),
      allInstallLinksSafe: installLinks.length >= expectedInstallUrls.length
        && installLinks.every((link) => link.target === "_blank" && link.rel.includes("noopener")),
      comparisonColumns: table ? table.querySelectorAll("thead th[scope='col']").length : 0,
      comparisonRows: comparisonRows.length,
      comparisonStatusCells: comparisonValues.length,
      comparisonStatusRatio: comparisonDataCells.length ? comparisonValues.length / comparisonDataCells.length : 0,
      comparisonStatusesAccessible: comparisonValues.every((cell) => {
        const icon = cell.querySelector(".comparison-icon[aria-hidden='true']");
        const screenReaderText = cell.querySelector(".sr-only")?.textContent.trim();
        return Boolean(icon && screenReaderText);
      }),
      hasChecks: Boolean(table?.querySelector(".comparison-value-yes .comparison-icon-yes")),
      hasCrosses: Boolean(table?.querySelector(".comparison-value-no .comparison-icon-no")),
      hasCaption: Boolean(table?.querySelector("caption")),
      hasJsonCrack: comparisonHeaders.some((header) => header.includes("JSON Crack")),
      hasDevToys: comparisonHeaders.some((header) => header.includes("DevToys")),
      allComparisonRowsHaveFiveProducts: comparisonRows.every((row) => row.cells.length === 5),
      codePrettifyOnlyRowsAreUnique: codePrettifyOnlyRows.every((label) => {
        const row = comparisonRows.find((candidate) => candidate.label === label);
        return row?.cells.length === 5 && row.cells[0].yes && row.cells.slice(1).every((cell) => cell.no);
      }),
      jsonCrackStatusesMatch: Array.from(jsonCrackExpectedStatuses, ([label, expectedYes]) => {
        const cell = comparisonRows.find((candidate) => candidate.label === label)?.cells[2];
        return cell && cell.yes === expectedYes && cell.no === !expectedYes;
      }).every(Boolean),
      hasEarlyTesterMessage: bodyText.includes("early tester") && bodyText.includes("help shape codeprettify"),
      hasFreePromise: bodyText.includes("free for everyone who installs now"),
      hasZeroPrice: bodyText.includes("$0"),
      uniqueInstallUrls: new Set(installLinks.map((link) => link.href)).size,
    };
  }, INSTALL_URLS);

  assert(pricing.activePriceLink, "Pricing page does not mark Price as the current page");
  assert(pricing.hasEarlyTesterMessage, "Pricing page is missing its early-tester message");
  assert(pricing.hasFreePromise, "Pricing page is missing the install-now free promise");
  assert(pricing.hasZeroPrice, "Pricing page is missing its $0 price");
  assert(pricing.allInstallUrlsPresent, "Pricing page is missing one or more store installation URLs");
  assert(pricing.uniqueInstallUrls === INSTALL_URLS.length, "Pricing page contains an unexpected installation URL");
  assert(pricing.allInstallLinksSafe, "Pricing install links must open safely in a new tab");
  assert(pricing.hasCaption, "Pricing comparison table is missing a caption");
  assert(pricing.comparisonColumns >= 6, "Pricing comparison table is missing product columns");
  assert(pricing.comparisonRows >= 16, "Pricing comparison table is missing capability rows");
  assert(pricing.comparisonStatusCells >= 70, "Pricing comparison does not use enough visual status cells");
  assert(pricing.comparisonStatusRatio >= 0.85, "Pricing comparison still relies on too much cell text");
  assert(pricing.hasChecks && pricing.hasCrosses, "Pricing comparison must include both checks and red X states");
  assert(pricing.comparisonStatusesAccessible, "Pricing comparison status icons need screen-reader text");
  assert(pricing.hasJsonCrack && !pricing.hasDevToys, "Pricing comparison must use JSON Crack instead of DevToys");
  assert(pricing.allComparisonRowsHaveFiveProducts, "Every pricing comparison row must cover all five products");
  assert(pricing.codePrettifyOnlyRowsAreUnique, "CodePrettify-only comparison rows are missing or no longer unique");
  assert(pricing.jsonCrackStatusesMatch, "JSON Crack comparison statuses no longer match the documented product scope");
}

async function checkHomepageResourceLinks(page, baseUrl) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
  const resourceLinks = await page.evaluate(() => Array.from(document.querySelectorAll(".hero-resource-links a"), (link) => ({
    href: link.getAttribute("href"),
    isButton: link.classList.contains("btn"),
  })));

  assert(resourceLinks.some((link) => link.href === "manual.html"), "Homepage contextual links are missing the Manual");
  assert(resourceLinks.some((link) => link.href === "pricing.html"), "Homepage contextual links are missing Pricing");
  assert(resourceLinks.every((link) => !link.isButton), "Homepage Manual/Pricing references must be text links, not buttons");

  const storeButton = page.locator(".cta-buttons .store-cta");
  await storeButton.hover();
  await page.waitForTimeout(350);
  const hoverStyle = await storeButton.evaluate((element) => ({
    boxShadow: getComputedStyle(element).boxShadow,
    transform: getComputedStyle(element).transform,
  }));
  assert(hoverStyle.transform !== "none", "Microsoft Store CTA is missing the raised hover motion");
  assert(hoverStyle.boxShadow !== "none", "Microsoft Store CTA is missing the install-button hover shadow");
}

async function checkMobileMenu(page, baseUrl) {
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto(`${baseUrl}/manual.html`, { waitUntil: "domcontentloaded" });
  const toggle = page.locator(".menu-toggle");
  await toggle.click();
  assert(await toggle.getAttribute("aria-expanded") === "true", "Mobile menu did not open");
  await page.keyboard.press("Escape");
  assert(await toggle.getAttribute("aria-expanded") === "false", "Escape did not close the mobile menu");
  assert(await toggle.evaluate((element) => element === document.activeElement), "Escape did not restore focus to the menu button");
  await toggle.click();
  await page.mouse.click(10, 600);
  assert(await toggle.getAttribute("aria-expanded") === "false", "Outside click did not close the mobile menu");

  const contentsToggle = page.locator("#manual-toc-toggle");
  const contents = page.locator("#manual-toc");
  assert(await contentsToggle.getAttribute("aria-expanded") === "false", "Manual contents should start collapsed on a compact viewport");
  assert(!(await contents.isVisible()), "Collapsed manual contents are still visible");
  await contentsToggle.click();
  assert(await contentsToggle.getAttribute("aria-expanded") === "true", "Manual contents did not expand");
  assert(await contents.isVisible(), "Expanded manual contents are not visible");
}

async function checkManualControls(page, baseUrl) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/manual.html`, { waitUntil: "domcontentloaded" });
  const missingTopics = await page.evaluate((requiredTopics) => requiredTopics.filter((id) => !document.getElementById(id)), REQUIRED_MANUAL_TOPICS);
  assert(missingTopics.length === 0, `Manual is missing required topics: ${missingTopics.join(", ")}`);
  const search = page.locator("#manual-search");
  await search.fill("regex");
  const visibleAfterSearch = await page.locator(".manual-topic:not([hidden])").count();
  assert(visibleAfterSearch > 0, "Manual search returned no Regex sections");
  assert(await page.locator("#regex-playground").isVisible(), "Manual search hid the Regex Playground section");
  await search.fill("");
  await page.locator('[data-product="app"]').click();
  assert(await page.locator("#app-files-tabs").isVisible(), "App filter hid app instructions");
  assert(!(await page.locator("#browser-workflows").isVisible()), "App filter left extension-only instructions visible");
  await page.locator('[data-product="all"]').click();
  assert(await page.locator("#browser-workflows").isVisible(), "Clearing filters did not restore extension instructions");
}

async function checkManualScreenshots(page, baseUrl) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/manual.html`, { waitUntil: "domcontentloaded" });
  const expectedScreenshots = {
    "manual-screenshot-workspace": "viewer-workspace.png",
    "manual-screenshot-command-palette": "command-palette.png",
    "manual-screenshot-extension-launcher": "extension-launcher.png",
    "manual-screenshot-windows-paste-prettify": "windows-tabs-paste-prettify.png",
    "manual-screenshot-windows-tools-menu": "windows-tools-menu.png",
    "manual-screenshot-document-navigator": "document-navigator.png",
    "manual-screenshot-javascript-formatting": "javascript-formatting.png",
    "manual-screenshot-markdown": "markdown-rendered.png",
    "manual-screenshot-json-path": "json-path-inspector.png",
    "manual-screenshot-table": "table-view.png",
    "manual-screenshot-schema-validator": "schema-validator.png",
    "manual-screenshot-diagnostics": "statistics-diagnostics.png",
    "manual-screenshot-security-scan": "security-scan.png",
    "manual-screenshot-data-converter": "data-converter.png",
    "manual-screenshot-compare": "compare-semantic.png",
    "manual-screenshot-javascript-playground": "javascript-playground.png",
    "manual-screenshot-runtime-inspector": "runtime-inspector.png",
    "manual-screenshot-regex": "regex-playground.png",
    "manual-screenshot-http-client": "http-client.png",
    "manual-screenshot-settings-extension": "settings-extension.png",
    "manual-screenshot-settings-windows": "settings-windows.png",
  };
  const screenshots = await page.evaluate(() => Array.from(document.querySelectorAll(".manual-screenshot-open"), (button) => {
    const image = button.querySelector("img");
    return {
      alt: image?.getAttribute("alt"),
      controls: button.getAttribute("aria-controls"),
      fullSource: button.dataset.fullSrc,
      height: image?.getAttribute("height"),
      id: button.id,
      loading: image?.getAttribute("loading"),
      thumbnail: image?.getAttribute("src"),
      width: image?.getAttribute("width"),
    };
  }));

  assert(screenshots.length >= Object.keys(expectedScreenshots).length, `Manual has too few feature-specific screenshot guides (${screenshots.length})`);
  assert(await page.locator(".manual-screenshot figcaption").count() === 0, "Manual thumbnails still have captions");
  assert(await page.locator("#manual-screenshot-modal-close").count() === 0, "Manual screenshot dialog still has a close button");
  assert(await page.locator(".manual-screenshot-modal-caption").count() === 0, "Manual fullscreen screenshot still has descriptive text");
  screenshots.forEach((screenshot) => {
    assert(screenshot.controls === "manual-screenshot-modal", "Manual screenshot does not identify its dialog");
    assert(screenshot.fullSource?.startsWith("img/manual/") && !screenshot.fullSource.includes("_thumb"), `Manual screenshot is outside img/manual or has an invalid full source: ${screenshot.fullSource}`);
    assert(screenshot.thumbnail?.startsWith("img/manual/") && screenshot.thumbnail.endsWith("_thumb.png"), `Manual screenshot is not using an img/manual thumbnail: ${screenshot.thumbnail}`);
    assert((screenshot.alt || "").trim().length >= 24, `Manual screenshot needs descriptive alternative text: ${screenshot.id}`);
    assert(screenshot.loading === "lazy", `Manual thumbnail is not lazy-loaded: ${screenshot.thumbnail}`);
    assert(screenshot.width === "320" && screenshot.height === "200", `Manual thumbnail dimensions are missing: ${screenshot.thumbnail}`);
    assert(fs.existsSync(path.join(SITE_ROOT, screenshot.fullSource)), `Manual full screenshot is missing: ${screenshot.fullSource}`);
    assert(fs.existsSync(path.join(SITE_ROOT, screenshot.thumbnail)), `Manual thumbnail is missing: ${screenshot.thumbnail}`);
  });

  for (const [id, fileName] of Object.entries(expectedScreenshots)) {
    const screenshot = screenshots.find((item) => item.id === id);
    assert(screenshot, `Manual is missing feature screenshot #${id}`);
    assert(screenshot.fullSource === `img/manual/${fileName}`, `Manual screenshot #${id} uses the wrong feature image: ${screenshot.fullSource}`);
    assert(screenshot.thumbnail === `img/manual/${fileName.replace(/\.png$/, "_thumb.png")}`, `Manual screenshot #${id} uses the wrong feature thumbnail: ${screenshot.thumbnail}`);
  }

  const placement = await page.evaluate(() => {
    const precedingText = (id) => document.getElementById(id)?.closest(".manual-screenshot-grid")?.previousElementSibling?.textContent?.replace(/\s+/g, " ").trim() || "";
    const settingsExtension = document.getElementById("manual-screenshot-settings-extension")?.closest(".manual-screenshot-grid");
    const settingsWindows = document.getElementById("manual-screenshot-settings-windows")?.closest(".manual-screenshot-grid");
    return {
      commandPalette: precedingText("manual-screenshot-command-palette"),
      diagnostics: precedingText("manual-screenshot-diagnostics"),
      regex: precedingText("manual-screenshot-regex"),
      security: precedingText("manual-screenshot-security-scan"),
      settingsShareGrid: Boolean(settingsExtension && settingsExtension === settingsWindows),
      settingsPreviousClass: settingsExtension?.previousElementSibling?.className || "",
    };
  });
  assert(placement.commandPalette.includes("palette only lists actions"), "Command Palette screenshot is not directly below its explanation");
  assert(placement.regex.includes("complete /pattern/flags form"), "Regex screenshot is not directly below the modern playground instructions");
  assert(placement.diagnostics.includes("Diagnostics combines syntax status"), "Diagnostics screenshot is not directly below Diagnostics");
  assert(placement.security.includes("Run Security Scan"), "Security Scan screenshot is not directly below Security Scan");
  assert(placement.settingsShareGrid, "Extension and Windows settings screenshots are not presented side by side");
  assert(placement.settingsPreviousClass.includes("manual-card-grid"), "Settings screenshots are not directly below the shared settings explanation");
  assert(expectedScreenshots["manual-screenshot-diagnostics"] !== expectedScreenshots["manual-screenshot-security-scan"], "Diagnostics and Security Scan must use distinct screenshots");

  const workspaceTrigger = page.locator("#manual-screenshot-workspace");
  const dialog = page.locator("#manual-screenshot-modal");
  const image = page.locator("#manual-screenshot-modal-image");
  await workspaceTrigger.click();
  assert(await dialog.isVisible(), "Manual screenshot dialog did not open");
  assert(await dialog.evaluate((element) => element === document.activeElement), "Manual screenshot dialog did not receive focus");
  assert((await image.getAttribute("src"))?.endsWith("viewer-workspace.png"), "Manual dialog did not load the full workspace screenshot");
  assert((await dialog.getAttribute("aria-label"))?.includes("Viewer workspace"), "Manual dialog label does not match its trigger");
  assert((await dialog.getAttribute("aria-label"))?.includes("Click anywhere or press Escape"), "Manual dialog does not explain how to close it");
  assert((await dialog.innerText()).trim() === "", "Manual fullscreen screenshot contains visible descriptive text");
  assert(await page.locator("body").evaluate((element) => element.classList.contains("screenshot-modal-open")), "Manual screenshot dialog did not lock background scrolling");
  const manualModalPresentation = await page.locator(".manual-screenshot-modal-content").evaluate((element) => {
    const style = getComputedStyle(element);
    const overlayStyle = getComputedStyle(element.closest(".screenshot-modal"));
    return {
      backdropFilter: overlayStyle.backdropFilter || overlayStyle.webkitBackdropFilter,
      backgroundColor: style.backgroundColor,
      borderTopWidth: style.borderTopWidth,
      boxShadow: style.boxShadow,
    };
  });
  assert(manualModalPresentation.backdropFilter === "blur(4px)", "Fullscreen screenshot overlay is too blurry");
  assert(manualModalPresentation.backgroundColor === "rgba(0, 0, 0, 0)", "Manual fullscreen screenshot still has a background box");
  assert(manualModalPresentation.borderTopWidth === "0px", "Manual fullscreen screenshot still has a container border");
  assert(manualModalPresentation.boxShadow === "none", "Manual fullscreen screenshot still has a container shadow");

  await page.keyboard.press("Tab");
  assert(await dialog.evaluate((element) => element === document.activeElement), "Manual screenshot dialog did not trap Tab focus");
  await page.keyboard.press("Shift+Tab");
  assert(await dialog.evaluate((element) => element === document.activeElement), "Manual screenshot dialog did not trap reverse Tab focus");
  await image.click();
  assert(!(await dialog.isVisible()), "Clicking a manual screenshot did not close the dialog");
  assert(await workspaceTrigger.evaluate((element) => element === document.activeElement), "Manual screenshot click did not restore trigger focus");

  await workspaceTrigger.click();
  await page.keyboard.press("Escape");
  assert(!(await dialog.isVisible()), "Escape did not close the manual screenshot dialog");
  assert(await workspaceTrigger.evaluate((element) => element === document.activeElement), "Manual screenshot dialog did not restore trigger focus");

  const regexTrigger = page.locator("#manual-screenshot-regex");
  await regexTrigger.click();
  assert((await image.getAttribute("src"))?.endsWith("regex-playground.png"), "Opening another thumbnail did not update the full screenshot");
  assert((await dialog.getAttribute("aria-label"))?.includes("Regex Playground"), "Opening another thumbnail did not update the dialog label");
  await image.click();
  assert(!(await dialog.isVisible()), "Clicking inside the manual screenshot dialog did not close it");

  await page.setViewportSize({ width: 375, height: 760 });
  await workspaceTrigger.click();
  const compactBounds = await page.locator(".manual-screenshot-modal-content").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top, viewportHeight: innerHeight, viewportWidth: innerWidth };
  });
  assert(compactBounds.left >= 0 && compactBounds.right <= compactBounds.viewportWidth, "Manual screenshot dialog exceeds the compact viewport width");
  assert(compactBounds.top >= 0 && compactBounds.bottom <= compactBounds.viewportHeight, "Manual screenshot dialog exceeds the compact viewport height");
  await dialog.click({ position: { x: 3, y: 3 } });
  assert(!(await dialog.isVisible()), "Clicking the compact manual screenshot dialog did not close it");
}

async function checkScreenshotDialog(page, baseUrl) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
  const trigger = page.locator("#main-screenshot-trigger");
  const dialog = page.locator("#screenshot-modal");
  const image = page.locator("#screenshot-modal-image");
  assert(await page.locator("#screenshot-modal-close").count() === 0, "Homepage screenshot dialog still has a close button");
  await trigger.click();
  assert(await dialog.isVisible(), "Screenshot dialog did not open");
  assert(await dialog.evaluate((element) => element === document.activeElement), "Screenshot dialog did not receive focus");
  await page.keyboard.press("Tab");
  assert(await dialog.evaluate((element) => element === document.activeElement), "Screenshot dialog did not trap Tab focus");
  await image.click();
  assert(!(await dialog.isVisible()), "Clicking the screenshot did not close the dialog");
  assert(await trigger.evaluate((element) => element === document.activeElement), "Screenshot click did not restore trigger focus");

  await trigger.click();
  await page.keyboard.press("Escape");
  assert(!(await dialog.isVisible()), "Escape did not close the screenshot dialog");
  assert(await trigger.evaluate((element) => element === document.activeElement), "Screenshot dialog did not restore trigger focus");

  await trigger.click();
  await dialog.click({ position: { x: 3, y: 3 } });
  assert(!(await dialog.isVisible()), "Clicking the screenshot backdrop did not close the dialog");

  await page.setViewportSize({ width: 600, height: 760 });
  await page.locator(".screenshot-tab").first().click();
  assert(await page.locator(".screenshot-modal-caption").isVisible(), "Compact screenshot caption is not visible");
  await page.locator("#screenshot-modal-description").click();
  assert(!(await dialog.isVisible()), "Clicking the screenshot caption did not close the dialog");
}

async function main() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const pageName of PAGES) await checkPageStructure(page, baseUrl, pageName);
    await checkInternalLinks(page, baseUrl);
    await checkResponsiveLayout(page, baseUrl);
    await checkMobileMenu(page, baseUrl);
    await checkPricingPage(page, baseUrl);
    await checkHomepageResourceLinks(page, baseUrl);
    await checkManualControls(page, baseUrl);
    await checkManualScreenshots(page, baseUrl);
    await checkScreenshotDialog(page, baseUrl);
    console.log(`Website checks passed for ${PAGES.length} pages.`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
