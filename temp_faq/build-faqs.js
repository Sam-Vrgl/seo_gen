// build-faqs.js
// Node 16+
// Usage: node build-faqs.js [input=faqs.json] [template=template.json] [outdir=./out]

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const INPUT = process.argv[2] || "faqs.json";        // the array you generated earlier
const TEMPLATE = process.argv[3] || "template.json"; // the Elementor template object
const OUTDIR = process.argv[4] || path.join(".", "out");

// ---------- helpers ----------
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")     // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);

const shortId = () => crypto.randomBytes(3).toString("hex"); // 6 hex chars like "1f31a76" style

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtmlParagraphs(text) {
  // Split on blank lines, trim, wrap each paragraph in <p>...</p>
  const paragraphs = String(text)
    .split(/\n\s*\n/g)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escapeHtml(p)}</p>`);
  // Fallback if empty
  return paragraphs.length ? paragraphs.join("") : "<p></p>";
}

// Deep clone via JSON roundtrip (template is pure JSON)
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// ---------- main ----------
function main() {
  // Ensure out dir
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  // Read input and template
  const pages = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const template = JSON.parse(fs.readFileSync(TEMPLATE, "utf8"));

  // Sanity: find the widget settings path that holds "tabs"
  // Expected: template.elements[0].settings.tabs = [...]
  function getTabsSetter(base) {
    if (!base?.elements?.[0]?.settings) {
      throw new Error("Template structure unexpected: .elements[0].settings not found.");
    }
    return base.elements[0].settings;
  }

  let created = 0;

  for (const page of pages) {
    const { page_title, items, page_number } = page;
    if (!page_title || !Array.isArray(items)) continue;

    // Build Elementor "tabs" from items
    const tabs = items.map(({ item_title, text }) => ({
      tab_title: String(item_title || "").trim(),
      tab_content: textToHtmlParagraphs(text || ""),
      _id: shortId()
    }));

    // Clone template and inject tabs
    const outObj = deepClone(template);
    const settings = getTabsSetter(outObj);
    settings.tabs = tabs;

    // Optional: also inject page title/number if useful
    // settings._title = page_title;
    // settings._page_number = page_number ?? null;

    // Build filename: <number>-faq-<page-title>.json (or without number if null)
    const slug = slugify(page_title);
    const prefix = Number.isFinite(page_number) ? `${page_number}-` : "";
    const filename = `${prefix}faq-${slug}.json`;

    const outfile = path.join(OUTDIR, filename);
    fs.writeFileSync(outfile, JSON.stringify(outObj, null, 2), "utf8");
    created++;
  }

  console.log(`✅ Created ${created} files in ${OUTDIR}`);
}

main();
