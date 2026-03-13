// md2faqs.js
// Node 16+
//
// Usage: node md2faqs.js [inputDir=./md] [outputFile=./faqs.json]
//
// Reads .md files, skips the top anchor list, parses "##" pages and "###" items,
// strips markdown formatting in text, and outputs a single big JSON.
// NEW: keeps the leading page number from "##" as page_number (Number).

const fs = require("fs");
const path = require("path");

const INPUT_DIR = process.argv[2] || "./md";
const OUTPUT_FILE = process.argv[3] || "./faqs.json";
// Optional CLI sorting: node md2faqs.js ./md ./faqs.json asc|desc
const SORT_DIR = (process.argv[4] || "asc").toLowerCase(); // "asc" or "desc"


function readMarkdownFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => e.isFile() && e.name.toLowerCase().endsWith(".md"))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return entries.map(e => ({
        name: e.name,
        content: fs.readFileSync(path.join(dir, e.name), "utf8")
    }));
}

// Put this near the top and reuse in both functions:
const LINK_RX = /\[((?:\\.|[^\]])+)\]\(([^)]+)\)/;       // single-match
const LINK_RX_GLOBAL = /\[((?:\\.|[^\]])+)\]\(([^)]+)\)/g; // global

function unescapeBrackets(s) {
    return s.replace(/\\\[/g, "[").replace(/\\\]/g, "]");
}


// Strip most markdown formatting to plain text.
function stripMarkdown(md) {
    if (!md) return "";
    let s = String(md);

    // Fenced code: drop fences, keep inner text
    s = s.replace(/```[\s\S]*?```/g, m => m.replace(/```/g, ""));

    // Inline code
    s = s.replace(/`([^`]+)`/g, "$1");

    // Images: ![alt](url) -> alt
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1");

    // Links: [text](url) -> text (supports escaped chars inside [])
    s = s.replace(LINK_RX_GLOBAL, (_, txt) => unescapeBrackets(txt));

    // Footnotes
    s = s.replace(/\[\^\d+\]/g, "");
    s = s.replace(/^\[\^\d+\]:.*$/gm, "");

    // Emphasis / strike
    s = s.replace(/(\*\*|__)(.*?)\1/g, "$2");
    s = s.replace(/(\*|_)(.*?)\1/g, "$2");
    s = s.replace(/~~(.*?)~~/g, "$1");

    // HTML tags
    s = s.replace(/<\/?[^>]+>/g, "");

    // Heading markers
    s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");

    // Table junk
    s = s.replace(/^\s*\|/gm, "");
    s = s.replace(/\|\s*$/gm, "");
    s = s.replace(/^\s*:\-+:?\s*(\|\s*:\-+:?\s*)+$/gm, "");

    // Anchor ids {#id}
    s = s.replace(/\{#[^}]+\}/g, "");

    // Whitespace tidy
    s = s.replace(/[ \t]+\n/g, "\n");
    s = s.replace(/[ \t]{2,}/g, " ");
    s = s.replace(/\r\n/g, "\n");
    s = s.replace(/[ \t]+$/gm, "");

    return s.trim();
}

// Is the top anchor list line (to skip) until first real ## heading?
function isTopAnchorLine(line) {
    if (!line.trim()) return true;
    const m = line.match(/^\s*\[[^\]]+\]\(#.+\)\s*$/);
    return Boolean(m);
}

// Parse a "##" line, extracting title, link, and the leading page number.
// Examples handled:
//   ## 18_[**Title**](https://example.com) {#id}
//   ## 12_Title {#id}
//   ## 7 - Title
//   ## 3. Title
//   ## Title only
function parseH2Meta(line) {
    // Remove leading ## and trailing {#id}
    let rest = line.replace(/^\s{0,3}##\s*/, "").trim();
    rest = rest.replace(/\{#[^}]+\}\s*$/, "").trim();

    // Capture leading number with common separators; allow an OPTIONAL backslash before '_' (e.g., 18\_)
    // Matches: "18_", "18\_", "18-", "18.", "18:", "18 –", "18 —"
    let pageNumber = null;
    const numMatch = rest.match(/^(\d{1,4})\s*\\?[_\.\-:–—]\s*/);
    if (numMatch) {
        pageNumber = parseInt(numMatch[1], 10);
        rest = rest.slice(numMatch[0].length).trim();
    } else {
        // Also allow "18 " (space) before title
        const numSpace = rest.match(/^(\d{1,4})\s+/);
        if (numSpace) {
            pageNumber = parseInt(numSpace[1], 10);
            rest = rest.slice(numSpace[0].length).trim();
        }
    }

    // If it contains a link, prefer link text as title and capture URL
    const linkMatch = rest.match(LINK_RX);
    let title, link = null;
    if (linkMatch) {
        title = unescapeBrackets(stripMarkdown(linkMatch[1]).trim());
        link = linkMatch[2].trim();
    } else {
        title = stripMarkdown(rest).trim();
    }

    return { title, link, pageNumber };
}


// Treat an H2 as empty if, after parsing, there is no usable title
function isEmptyH2(line) {
    const { title } = parseH2Meta(line);
    return !title || !title.trim();
}

function parseMarkdownToPages(md, fileName = "") {
    const lines = md.split(/\r?\n/);

    // Skip top anchor block
    let i = 0;
    while (i < lines.length && (isTopAnchorLine(lines[i]) || !lines[i].trim())) i++;

    const pages = [];
    let currentPage = null;
    let currentItem = null;
    let buffer = [];

    function flushItem() {
        if (!currentItem) return;
        const raw = buffer.join("\n").trim();
        const normalized = raw.replace(/\n{3,}/g, "\n\n");
        const text = stripMarkdown(normalized).replace(/\n{3,}/g, "\n\n").trim();
        currentPage.items.push({ item_title: currentItem.item_title, text });
        currentItem = null;
        buffer = [];
    }

    function flushPage() {
        if (!currentPage) return;
        flushItem();
        // Keep only pages with a non-empty title and at least one item
        if (currentPage.page_title && currentPage.page_title.trim() && currentPage.items.length > 0) {
            pages.push(currentPage);
        }
        currentPage = null;
    }

    for (; i < lines.length; i++) {
        const line = lines[i];

        // New page
        if (/^\s{0,3}##\s+/.test(line)) {
            if (isEmptyH2(line)) continue;
            flushPage();

            const { title, link, pageNumber } = parseH2Meta(line);
            if (!title) continue;

            currentPage = {
                page_title: title.trim(),
                page_link: link || null,
                page_number: Number.isFinite(pageNumber) ? pageNumber : null,
                items: []
            };
            currentItem = null;
            buffer = [];
            continue;
        }

        // New item
        if (/^\s{0,3}###\s+/.test(line)) {
            if (!currentPage) continue; // ignore stray ###
            flushItem();
            let itemTitle = line.replace(/^\s{0,3}###\s+/, "");
            itemTitle = stripMarkdown(itemTitle.replace(/\{#[^}]+\}\s*$/, "")).trim();
            if (!itemTitle) continue; // ignore empty ###
            currentItem = { item_title: itemTitle };
            buffer = [];
            continue;
        }

        // Accumulate text only when inside an item
        if (currentItem) buffer.push(line);
    }

    // End of file
    flushPage();
    return pages;
}

function main() {
    if (!fs.existsSync(INPUT_DIR) || !fs.statSync(INPUT_DIR).isDirectory()) {
        console.error(`Input dir not found: ${INPUT_DIR}`);
        process.exit(1);
    }

    const mdFiles = readMarkdownFiles(INPUT_DIR);
    if (mdFiles.length === 0) {
        console.error(`No .md files found in ${INPUT_DIR}`);
        process.exit(1);
    }

    const allPages = [];
    for (const { name, content } of mdFiles) {
        const pages = parseMarkdownToPages(content, name);
        allPages.push(...pages);
    }



    const sorted = allPages.slice().sort((a, b) => {
        const an = Number.isFinite(a.page_number) ? a.page_number : Infinity;
        const bn = Number.isFinite(b.page_number) ? b.page_number : Infinity;
        if (an === bn) return 0;
        return SORT_DIR === "desc" ? bn - an : an - bn;
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2), "utf8");
    console.log(`✅ Wrote ${sorted.length} pages to ${OUTPUT_FILE} (sorted ${SORT_DIR})`);
}

main();
