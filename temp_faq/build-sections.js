// build-faqs.js
// Usage: node build-faqs.js [input=faqs.json] [section=section.json] [outdir=./out]

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const INPUT = process.argv[2] || "faqs.json";
const SECTION = process.argv[3] || "section.json";
const OUTDIR = process.argv[4] || path.join(".", "section-out");

// ---------- helpers ----------
const slugify = (s) =>
    s.toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 80);

const shortId = (len = 7) => crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function textToHtmlParagraphs(text) {
    const paragraphs = String(text)
        .split(/\n\s*\n/g)
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => `<p>${escapeHtml(p)}</p>`);
    return paragraphs.length ? paragraphs.join("") : "<p></p>";
}

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// Recursively walk and regenerate element IDs
function walkElements(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.elements)) {
        node.elements.forEach(child => walkElements(child, fn));
    }
}

function regenerateIds(root) {
    walkElements(root, el => {
        if (el.id) el.id = shortId(7);
    });
    return root;
}

// Find first widget containing settings.tabs (Toggle widget)
function findTabsWidget(root) {
    let found = null;
    walkElements(root, el => {
        if (!found && el.elType === "widget" && el.settings && Array.isArray(el.settings.tabs)) {
            found = el;
        }
    });
    return found;
}

// Remove Elementor runtime/editor caches from a whole element tree
function stripRuntimeCaches(root) {
    const KEY_RX = /^(html_?cache|render_?attributes(_cache)?|_element_?cache|editSettings|defaultEditRoute|_inline_editor|inline_editing|__cached|__placeholder)$/i;

    function walk(node) {
        if (!node || typeof node !== "object") return;

        // delete keys that match in this node
        for (const k of Object.keys(node)) {
            if (KEY_RX.test(k)) {
                delete node[k];
                continue;
            }
            // also catch camelCase variants by normalizing the key
            const norm = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
            if (KEY_RX.test(norm)) delete node[k];
        }

        // clean settings too
        if (node.settings && typeof node.settings === "object") {
            for (const k of Object.keys(node.settings)) {
                const norm = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
                if (KEY_RX.test(k) || KEY_RX.test(norm)) delete node.settings[k];
            }
        }

        // recurse into children
        if (Array.isArray(node.elements)) node.elements.forEach(walk);
    }

    walk(root);
    return root;
}



// ---------- main ----------
function main() {
    if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

    const pages = JSON.parse(fs.readFileSync(INPUT, "utf8"));
    const section = JSON.parse(fs.readFileSync(SECTION, "utf8"));

    if (!section?.elements?.[0] || section.elements[0].elType !== "section") {
        throw new Error("section.json must contain a full Elementor *section* export.");
    }

    let created = 0;

    for (const page of pages) {
        const { page_title, items, page_number } = page || {};
        if (!page_title || !Array.isArray(items)) continue;

        const tabs = items.map(({ item_title, text }) => ({
            tab_title: String(item_title || "").trim(),
            tab_content: textToHtmlParagraphs(text || ""),
            _id: shortId(7)
        }));

        const doc = deepClone(section);

        regenerateIds(doc);

        const tabsWidget = findTabsWidget(doc);
        if (!tabsWidget) {
            throw new Error("No widget with settings.tabs found in section.json. Place a Toggle widget in your section template.");
        }

        tabsWidget.settings.tabs = tabs;

        // important: also kill any cache directly on the widget
        delete tabsWidget.htmlCache;
        delete tabsWidget.settings?.htmlCache;
        delete tabsWidget.settings?.html_cache;

        // strip caches everywhere in the section
        stripRuntimeCaches(doc);

        const slug = slugify(page_title);
        const prefix = Number.isFinite(page_number) ? `${page_number}-` : "";
        const filename = `${prefix}faq-${slug}.json`;

        fs.writeFileSync(path.join(OUTDIR, filename), JSON.stringify(doc, null, 2), "utf8");
        created++;
    }

    console.log(`✅ Created ${created} section-based FAQ blocks in ${OUTDIR}`);
}

main();
