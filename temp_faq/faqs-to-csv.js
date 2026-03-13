// faqs-to-csv.js
// Usage:
//   node faqs-to-csv.js [input=faqs.json] > faqs-tracker.csv
//
// Resulting CSV columns: page_number,page_title,page_link,added

const fs = require("fs");
const path = require("path");

const INPUT = process.argv[2] || "faqs.json";

// CSV escaper: wrap in quotes, double any embedded quotes
function csvCell(v) {
  if (v === null || v === undefined) v = "";
  v = String(v).replace(/\r\n/g, "\n");     // normalize
  v = v.replace(/"/g, '""');                // escape quotes
  return `"${v}"`;
}

function main() {
  const pages = JSON.parse(fs.readFileSync(path.resolve(INPUT), "utf8"));

  const rows = [];
  // Updated header
  rows.push(["page_number", "page_title", "page_link", "added"].map(csvCell).join(","));

  for (const p of pages) {
    const number = p.page_number !== null && p.page_number !== undefined ? p.page_number : "";
    const title  = p.page_title || "";
    const link   = p.page_link || "";
    const added  = ""; // leave blank so Google Sheets checkboxes can be inserted cleanly

    rows.push([number, title, link, added].map(csvCell).join(","));
  }

  process.stdout.write(rows.join("\n") + "\n");
}

main();
