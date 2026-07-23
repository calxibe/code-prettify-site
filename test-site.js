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
  "schema-validator", "analysis-tools", "data-converter", "structured-workbench", "copy-export", "compare",
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
const HOMEPAGE_SCREENSHOTS = [
  { file: "feature-json-format.png", label: "JSON" },
  { file: "feature-json-to-code.png", label: "JSON to Code" },
  { file: "feature-workbench-repair.png", label: "Repair" },
  { file: "feature-workbench-transform.png", label: "Transform" },
  { file: "feature-data-converter-utilities.png", label: "Data Converter" },
  { file: "feature-security-scan.png", label: "Security Scan" },
  { file: "feature-js-transform.png", label: "JavaScript" },
  { file: "feature-js-playground.png", label: "JS Playground" },
  { file: "feature-markdown.png", label: "Markdown" },
  { file: "feature-http-client.png", label: "HTTP Client" },
  { file: "feature-diff-view.png", label: "Diff View" },
  { file: "feature-table-view.png", label: "Table View" },
  { file: "feature-stats-diagnostics.png", label: "Diagnostics" },
  { file: "feature-settings.png", label: "Settings" },
  { file: "feature-diff-view-dark.png", label: "Diff View" },
  { file: "feature-regex-playground.png", label: "Regex Playground" },
];
const NEW_HOMEPAGE_SCREENSHOTS = HOMEPAGE_SCREENSHOTS.slice(1, 6);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readPngDimensions(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 24);
  assert(header.length === 24 && header.toString("hex", 0, 8) === "89504e470d0a1a0a", `${path.basename(filePath)} is not a valid PNG`);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
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

  const jsonToCode = await page.locator("#json-to-code-feature").evaluate((element) => ({
    heading: element.querySelector("h3")?.textContent?.trim() || "",
    links: Array.from(element.querySelectorAll("a"), (link) => link.getAttribute("href")),
    listItems: element.querySelectorAll(".feature-list li").length,
    text: element.textContent.replace(/\s+/g, " ").trim(),
    width: element.getBoundingClientRect().width,
  }));
  const metaDescription = await page.locator('meta[name="description"]').getAttribute("content");
  assert(jsonToCode.heading.includes("JSON Samples"), "Homepage JSON-to-Code spotlight is missing its audience-facing heading");
  assert(jsonToCode.listItems >= 4, "Homepage JSON-to-Code spotlight does not explain the workflow");
  assert(jsonToCode.text.includes("TypeScript") && jsonToCode.text.includes("JSON Schema"), "Homepage JSON-to-Code spotlight is missing its target range");
  assert(jsonToCode.text.includes("Local-only") && jsonToCode.text.includes("uploading"), "Homepage JSON-to-Code spotlight does not explain local processing");
  assert(jsonToCode.links.includes("manual.html#json-to-code"), "Homepage JSON-to-Code spotlight does not link to the manual");
  assert(jsonToCode.links.includes("changelog.html"), "Homepage JSON-to-Code spotlight does not link to release notes");
  assert(jsonToCode.width > 900, "Homepage JSON-to-Code spotlight does not span the desktop feature grid");
  assert(metaDescription?.includes("TypeScript") && metaDescription?.includes("JSON Schema"), "Homepage metadata does not advertise JSON-to-Code generation");

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

async function checkStructuredWorkbenchDocumentation(page, baseUrl) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/manual.html`, { waitUntil: "domcontentloaded" });
  const manual = await page.evaluate(() => {
    const topic = document.getElementById("structured-workbench");
    const text = topic?.textContent.replace(/\s+/g, " ").trim() || "";
    const settingsText = document.getElementById("settings")?.textContent.replace(/\s+/g, " ").trim() || "";
    const workspaceText = document.getElementById("workspace")?.textContent.replace(/\s+/g, " ").trim() || "";
    return {
      formatRows: topic?.querySelectorAll(".manual-workbench-format-table tbody tr").length || 0,
      hasTocLink: Boolean(document.querySelector('.manual-toc a[href="#structured-workbench"]')),
      metaDescription: document.querySelector('meta[name="description"]')?.content || "",
      operationRows: topic?.querySelectorAll(".manual-workbench-operation-table tbody tr").length || 0,
      settingsText,
      text,
      workspaceText,
    };
  });
  assert(manual.hasTocLink, "Manual contents are missing JSON Repair & Transform");
  assert(manual.metaDescription.includes("repair") && manual.metaDescription.includes("transform"), "Manual metadata does not describe the Workbench workflow");
  assert(manual.formatRows === 6, `Manual documents ${manual.formatRows} Workbench format groups instead of 6`);
  assert(manual.operationRows === 9, `Manual documents ${manual.operationRows} Workbench operations instead of 9`);
  assert(manual.workspaceText.includes("For this file") && manual.workspaceText.includes("General tools"), "Manual workspace chapter is missing the two-column More Actions guidance");
  assert(manual.settingsText.includes("small, medium, and large control scale"), "Manual settings chapter is missing the shared interface-control guidance");
  assert(manual.settingsText.includes("buttons, and icon buttons"), "Manual settings chapter is missing the shared button-scale guidance");
  assert(manual.settingsText.includes("compact 13px code-text scale"), "Manual settings chapter is missing the shared technical-textarea guidance");
  assert(manual.settingsText.includes("one typography system"), "Manual settings chapter is missing the shared typography guidance");
  for (const requiredText of [
    "Repair & Salvage", "Allow partial-record salvage", "Use result in Transform", "Add a transformation", "More transformations", "No rows matched", "owners[].name",
    "250,000 nodes", "512 nesting levels", "32 steps", "never modified", "always available",
  ]) {
    assert(manual.text.includes(requiredText), `Manual Workbench chapter is missing: ${requiredText}`);
  }
  const search = page.locator("#manual-search");
  await search.fill("partial salvage");
  assert(await page.locator("#structured-workbench").isVisible(), "Manual search cannot find the partial-salvage guidance");

  const changelogs = [
    ["changelog.html", "v1.0.49", "opened separately"],
    ["changelog-app.html", "v1.1.5", "native Tools menu"],
  ];
  for (const [fileName, expectedVersion, productPhrase] of changelogs) {
    await page.goto(`${baseUrl}/${fileName}`, { waitUntil: "domcontentloaded" });
    const latest = await page.locator(".version-card").first().evaluate((card) => ({
      sections: Array.from(card.querySelectorAll(".version-section > h3"), (heading) => heading.textContent.trim()),
      text: card.textContent.replace(/\s+/g, " ").trim(),
      version: card.querySelector(".version-number")?.textContent.trim() || "",
    }));
    assert(latest.version === expectedVersion, `${fileName} Workbench notes are not attached to ${expectedVersion}`);
    assert(latest.sections.includes("Added") && latest.sections.includes("Security"), `${fileName} is missing Added/Security Workbench sections`);
    for (const requiredText of ["JSON Repair & Transform", "Repair & Salvage", "explicit opt-in", "fail-closed processing", "General-tool availability", "Two-column More Actions", "Guided JSON Repair & Transform experience", "Unified interface controls", "Nested-array filtering", productPhrase]) {
      assert(latest.text.includes(requiredText), `${fileName} latest release is missing: ${requiredText}`);
    }
  }
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
    "manual-screenshot-json-to-code-csharp": "json-to-code-csharp.png",
    "manual-screenshot-workbench-repair": "structured-workbench-repair.png",
    "manual-screenshot-workbench-transform": "structured-workbench-transform.png",
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
      jsonToCode: precedingText("manual-screenshot-json-to-code-csharp"),
      regex: precedingText("manual-screenshot-regex"),
      security: precedingText("manual-screenshot-security-scan"),
      workbenchRepair: precedingText("manual-screenshot-workbench-repair"),
      workbenchTransform: precedingText("manual-screenshot-workbench-transform"),
      settingsShareGrid: Boolean(settingsExtension && settingsExtension === settingsWindows),
      settingsPreviousClass: settingsExtension?.previousElementSibling?.className || "",
    };
  });
  assert(placement.commandPalette.includes("Document-specific commands follow the active format"), "Command Palette screenshot is not directly below its explanation");
  assert(placement.jsonToCode.includes("advanced order payload") && placement.jsonToCode.includes("System.Text.Json"), "JSON-to-Code C# screenshot is not directly below its advanced sample explanation");
  assert(placement.workbenchRepair.includes("Partial salvage is destructive"), "Workbench Repair screenshot is not directly below its safety explanation");
  assert(placement.workbenchTransform.includes("No rows matched"), "Workbench Transform screenshot is not directly below its pipeline-state explanation");
  assert(placement.regex.includes("complete /pattern/flags form"), "Regex screenshot is not directly below the modern playground instructions");
  assert(placement.diagnostics.includes("Diagnostics combines syntax status"), "Diagnostics screenshot is not directly below Diagnostics");
  assert(placement.security.includes("Run Security Scan"), "Security Scan screenshot is not directly below Security Scan");
  assert(placement.settingsShareGrid, "Extension and Windows settings screenshots are not presented side by side");
  assert(placement.settingsPreviousClass.includes("manual-card-grid"), "Settings screenshots are not directly below the shared settings explanation");
  assert(expectedScreenshots["manual-screenshot-diagnostics"] !== expectedScreenshots["manual-screenshot-security-scan"], "Diagnostics and Security Scan must use distinct screenshots");

  const manualCaptureScript = fs.readFileSync(path.join(SITE_ROOT, "..", "app", "capture-manual-screenshots.js"), "utf8");
  for (const requiredCaptureDetail of ["'json-to-code-csharp'", "selectOption('csharp')", "OrderResponse", "CodePrettify.Samples.Orders", "advancedCsharpSample"]) {
    assert(manualCaptureScript.includes(requiredCaptureDetail), `Manual screenshot generator is missing the C# capture detail: ${requiredCaptureDetail}`);
  }
  for (const requiredCaptureDetail of ["'structured-workbench-repair'", "'structured-workbench-transform'", "openStructuredWorkbench('repair')", "openStructuredWorkbench('transform')", "2 of 6 rows", "Repair complete"]) {
    assert(manualCaptureScript.includes(requiredCaptureDetail), `Manual screenshot generator is missing the Workbench capture detail: ${requiredCaptureDetail}`);
  }
  for (const requiredCaptureDetail of ["#floating-actions-menu.visible", "floating-contextual-actions", "floating-general-actions", "floating-structured-workbench-btn", "floating-json-to-code-btn", "floating-collapse-btn,floating-expand-btn"]) {
    assert(manualCaptureScript.includes(requiredCaptureDetail), `Manual workspace screenshot does not verify the current tool layout: ${requiredCaptureDetail}`);
  }
  for (const requiredCaptureDetail of ["workspaceTabTopGaps", "Math.max(...Object.values(workspaceTabTopGaps))", "title.nextElementSibling === hint", "hint.nextElementSibling === tabs", "tabs.nextElementSibling === panel", "hint.scrollHeight <= hint.clientHeight", "tabsRect.top - hintRect.bottom >= 3", "tabsRect.top - hintRect.bottom <= 5", "operationRect.top - tabsRect.bottom >= 11", "inputRect.top - inputHeaderRect.bottom >= 1", "outputRect.top - outputHeaderRect.bottom >= 1"]) {
    assert(manualCaptureScript.includes(requiredCaptureDetail), `Manual Data Converter capture does not reject clipped or overlapping header content: ${requiredCaptureDetail}`);
  }

  const nativeMainForm = fs.readFileSync(path.join(SITE_ROOT, "..", "app", "latest", "launcher", "MainForm.cs"), "utf8");
  const nativeCommandStates = fs.readFileSync(path.join(SITE_ROOT, "..", "app", "latest", "launcher", "MainForm.SettingsAndTheme.cs"), "utf8");
  for (const requiredNativeTool of ["JSON &Repair && Transform...", "JSON to &Code Generator..."]) {
    assert(nativeMainForm.includes(requiredNativeTool), `Windows Tools menu source is missing: ${requiredNativeTool.replace(/&/g, "")}`);
  }
  assert(
    nativeMainForm.indexOf("_miStructuredWorkbench") < nativeMainForm.indexOf("_miDataConverter")
      && nativeMainForm.indexOf("_miDataConverter") < nativeMainForm.indexOf("_miJsonToCode"),
    "Windows Tools menu no longer keeps Workbench, Data Converter, and JSON-to-Code together"
  );
  assert(!nativeCommandStates.includes("SupportsStructuredWorkbench"), "Windows still gates JSON Repair & Transform by file type");
  assert(
    /_miStructuredWorkbench\.Visible\s*=\s*true/.test(nativeCommandStates)
      && /_miStructuredWorkbench\.Enabled\s*=\s*enableWebOverlayActions/.test(nativeCommandStates),
    "Windows does not keep JSON Repair & Transform available with the general tools"
  );

  const workspaceTrigger = page.locator("#manual-screenshot-workspace");
  const dialog = page.locator("#manual-screenshot-modal");
  const image = page.locator("#manual-screenshot-modal-image");
  await workspaceTrigger.click();
  assert(await dialog.isVisible(), "Manual screenshot dialog did not open");
  assert(await dialog.evaluate((element) => element === document.activeElement), "Manual screenshot dialog did not receive focus");
  assert((await image.getAttribute("src"))?.endsWith("viewer-workspace.png"), "Manual dialog did not load the full workspace screenshot");
  assert((await dialog.getAttribute("aria-label"))?.includes("More Actions"), "Manual dialog label does not match its trigger");
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
  const trigger = page.locator(".screenshot-tab").first();
  const dialog = page.locator("#screenshot-modal");
  const image = page.locator("#screenshot-modal-image");
  const closeButton = page.locator("#screenshot-modal-close");
  const previousButton = page.locator("#screenshot-modal-prev");
  const nextButton = page.locator("#screenshot-modal-next");
  assert(await page.locator(".screenshot-stage").count() === 0, "Homepage still renders a separate screenshot preview above the thumbnails");
  await trigger.click();
  assert(await dialog.isVisible(), "Screenshot dialog did not open");
  assert(await closeButton.evaluate((element) => element === document.activeElement), "Screenshot close button did not receive focus");
  assert(await page.locator(".screenshot-modal-caption").isVisible(), "Fullscreen screenshot caption is not visible");
  assert((await page.locator("#screenshot-modal-counter").textContent())?.trim() === `1 / ${HOMEPAGE_SCREENSHOTS.length}`, "Screenshot counter did not start at the first image");
  const arrowAlignment = await page.evaluate(() => {
    const viewer = document.querySelector("#screenshot-modal .screenshot-modal-content");
    const previous = document.querySelector("#screenshot-modal-prev");
    if (!viewer || !previous) return null;
    const viewerRect = viewer.getBoundingClientRect();
    const arrowRect = previous.getBoundingClientRect();
    return Math.abs((viewerRect.top + viewerRect.height / 2) - (arrowRect.top + arrowRect.height / 2));
  });
  assert(arrowAlignment !== null && arrowAlignment <= 2, `Desktop screenshot arrows are not vertically centered (${arrowAlignment}px difference)`);
  const arrowGlyphAlignment = await page.evaluate(() => {
    const button = document.querySelector("#screenshot-modal-prev");
    const glyph = button?.querySelector("svg");
    if (!button || !glyph) return null;
    const buttonRect = button.getBoundingClientRect();
    const glyphRect = glyph.getBoundingClientRect();
    return Math.abs((buttonRect.top + buttonRect.height / 2) - (glyphRect.top + glyphRect.height / 2));
  });
  assert(arrowGlyphAlignment !== null && arrowGlyphAlignment <= 1, `Screenshot arrow glyph is not vertically centered inside its button (${arrowGlyphAlignment}px difference)`);
  assert(await image.evaluate((element) => getComputedStyle(element).cursor) === "default", "Fullscreen screenshot uses an unexpected clickable cursor");
  await image.click();
  assert(!(await dialog.isVisible()), "Clicking the fullscreen image did not close the dialog");
  assert(await trigger.evaluate((element) => element === document.activeElement), "Screenshot image click did not restore trigger focus");

  await trigger.click();

  await nextButton.click();
  assert((await image.getAttribute("src"))?.endsWith(HOMEPAGE_SCREENSHOTS[1].file), "Next screenshot control did not advance the image");
  assert((await page.locator("#screenshot-modal-counter").textContent())?.trim() === `2 / ${HOMEPAGE_SCREENSHOTS.length}`, "Screenshot counter did not advance");
  await page.keyboard.press("ArrowLeft");
  assert((await image.getAttribute("src"))?.endsWith(HOMEPAGE_SCREENSHOTS[0].file), "Left arrow did not show the previous screenshot");
  await page.keyboard.press("ArrowRight");
  assert((await image.getAttribute("src"))?.endsWith(HOMEPAGE_SCREENSHOTS[1].file), "Right arrow did not show the next screenshot");

  await previousButton.focus();
  await page.keyboard.press("Shift+Tab");
  assert(await nextButton.evaluate((element) => element === document.activeElement), "Screenshot dialog did not wrap reverse Tab focus");
  await page.keyboard.press("Tab");
  assert(await previousButton.evaluate((element) => element === document.activeElement), "Screenshot dialog did not wrap forward Tab focus");

  await closeButton.click();
  assert(!(await dialog.isVisible()), "Close button did not close the screenshot dialog");
  assert(await trigger.evaluate((element) => element === document.activeElement), "Screenshot close button did not restore trigger focus");

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
  assert(await dialog.isVisible(), "Clicking the screenshot caption unexpectedly closed the dialog");
  const compactBounds = await page.locator(".screenshot-modal-content").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top, viewportHeight: innerHeight, viewportWidth: innerWidth };
  });
  assert(compactBounds.left >= 0 && compactBounds.right <= compactBounds.viewportWidth, "Homepage screenshot viewer exceeds the compact viewport width");
  assert(compactBounds.top >= 0 && compactBounds.bottom <= compactBounds.viewportHeight, "Homepage screenshot viewer exceeds the compact viewport height");
  await closeButton.click();
}

async function checkHomepageScreenshotGallery(page, baseUrl) {
  const captureScript = fs.readFileSync(path.join(SITE_ROOT, "..", "browser", "capture-extension-screenshots.js"), "utf8");
  for (const { file } of NEW_HOMEPAGE_SCREENSHOTS) {
    const stem = file.replace(/\.png$/, "");
    for (const variant of [file, `${stem}_text.png`, `${stem}_thumb.png`]) {
      const imagePath = path.join(SITE_ROOT, "img", variant);
      assert(fs.existsSync(imagePath), `Homepage screenshot asset is missing: ${variant}`);
      assert(fs.statSync(imagePath).size > 1000, `Homepage screenshot asset is unexpectedly small: ${variant}`);
      const dimensions = readPngDimensions(imagePath);
      const expectedDimensions = variant.endsWith("_thumb.png")
        ? { width: 320, height: 200 }
        : { width: 1280, height: 800 };
      assert(
        dimensions.width === expectedDimensions.width && dimensions.height === expectedDimensions.height,
        `${variant} must be ${expectedDimensions.width}x${expectedDimensions.height}`
      );
    }
    assert(captureScript.includes(`'${file}'`), `Screenshot generator does not declare ${file}`);
  }
  assert(
    !fs.readFileSync(path.join(SITE_ROOT, "img", "feature-workbench-repair.png")).equals(
      fs.readFileSync(path.join(SITE_ROOT, "img", "feature-workbench-transform.png"))
    ),
    "Repair and Transform must use separate screenshots"
  );

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
  const tabs = page.locator(".screenshot-tab");
  const dialog = page.locator("#screenshot-modal");
  const image = page.locator("#screenshot-modal-image");
  const closeButton = page.locator("#screenshot-modal-close");
  assert(await tabs.count() === HOMEPAGE_SCREENSHOTS.length, "Homepage screenshot tabs and gallery data are out of sync");

  for (let index = 0; index < HOMEPAGE_SCREENSHOTS.length; index += 1) {
    const expected = HOMEPAGE_SCREENSHOTS[index];
    const tab = tabs.nth(index);
    assert((await tab.locator(".screenshot-tab-label").textContent())?.trim() === expected.label, `Screenshot tab ${index + 1} has the wrong label`);
    assert(await tab.getAttribute("aria-haspopup") === "dialog", `Screenshot tab ${index + 1} does not identify its fullscreen viewer`);
    await tab.click();
    await page.waitForFunction((file) => {
      const image = document.getElementById("screenshot-modal-image");
      return image?.complete && image.naturalWidth > 0 && image.src.endsWith(`/img/${file}`);
    }, expected.file);
    const galleryState = await page.evaluate(() => {
      const image = document.getElementById("screenshot-modal-image");
      const activeTabs = Array.from(document.querySelectorAll(".screenshot-tab.active"));
      return {
        alt: image?.alt || "",
        height: image?.naturalHeight || 0,
        pressed: activeTabs[0]?.getAttribute("aria-pressed"),
        width: image?.naturalWidth || 0,
        activeCount: activeTabs.length,
      };
    });
    assert(galleryState.width === 1280 && galleryState.height === 800, `${expected.file} must be a 1280x800 gallery image`);
    assert(galleryState.alt.length >= 30, `${expected.file} needs descriptive alternative text`);
    assert(galleryState.activeCount === 1 && galleryState.pressed === "true", `${expected.file} did not become the only active gallery item`);
    assert(await dialog.isVisible(), `${expected.file} did not open directly in the fullscreen viewer`);

    const thumbnail = tab.locator("img");
    await thumbnail.evaluate((image) => image.complete
      ? undefined
      : new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", reject, { once: true });
      }));
    const thumbnailState = await thumbnail.evaluate((image) => ({
      height: image.naturalHeight,
      src: image.getAttribute("src"),
      width: image.naturalWidth,
    }));
    assert(thumbnailState.src === `img/${expected.file.replace(/\.png$/, "_thumb.png")}`, `${expected.file} has the wrong thumbnail`);
    assert(thumbnailState.width === 320 && thumbnailState.height === 200, `${expected.file} thumbnail must be 320x200`);
    await closeButton.click();
  }
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
    await checkStructuredWorkbenchDocumentation(page, baseUrl);
    await checkManualScreenshots(page, baseUrl);
    await checkHomepageScreenshotGallery(page, baseUrl);
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
