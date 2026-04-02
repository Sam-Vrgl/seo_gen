import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { marked } from 'marked';

const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));
const shortId = (len = 7) => crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);

function walkElements(node: any, fn: (el: any) => void) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.elements)) {
        node.elements.forEach((child: any) => walkElements(child, fn));
    }
}

function regenerateIds(root: any) {
    walkElements(root, el => {
        if (el.id) el.id = shortId(7);
        if (el._id) el._id = shortId(7);
    });
    return root;
}

function stripRuntimeCaches(root: any) {
    const KEY_RX = /^(html_?cache|render_?attributes(_cache)?|_element_?cache|editSettings|defaultEditRoute|_inline_editor|inline_editing|__cached|__placeholder)$/i;

    function walk(node: any) {
        if (!node || typeof node !== "object") return;
        
        // delete matching keys in this node
        for (const k of Object.keys(node)) {
            if (KEY_RX.test(k)) {
                delete node[k];
                continue;
            }
            const norm = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
            if (KEY_RX.test(norm)) delete node[k];
        }

        // clean settings
        if (node.settings && typeof node.settings === "object") {
            for (const k of Object.keys(node.settings)) {
                const norm = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
                if (KEY_RX.test(k) || KEY_RX.test(norm)) delete node.settings[k];
            }
        }

        // recurse
        if (Array.isArray(node.elements)) node.elements.forEach(walk);
    }

    walk(root);
    return root;
}

export async function generateElementorArticle(title: string, markdownContent: string, illustrationBase64: string | null, faqContent: string | null = null) {
    const templatePath = path.join(process.cwd(), "..", "temp_faq", "example-section.json");
    if (!fs.existsSync(templatePath)) {
        throw new Error("Template not found at " + templatePath);
    }
    const section = JSON.parse(fs.readFileSync(templatePath, "utf8"));
    if (!section?.elements?.[0] || section.elements[0].elType !== "section") {
        throw new Error("Invalid section.json template");
    }

    const doc = deepClone(section);

    let htmlContent = await marked.parse(markdownContent);
    // Include image at the top of the text editor content if provided
    if (illustrationBase64) {
        const imgHtml = `<p><img src="data:image/jpeg;base64,${illustrationBase64}" style="max-width: 100%; border-radius: 8px; margin-bottom: 2rem; display: block; margin-left: auto; margin-right: auto;" /></p>\n\n`;
        htmlContent = imgHtml + htmlContent;
    }

    if (faqContent) {
        const faqHtml = await marked.parse(faqContent);
        htmlContent += `\n<hr style="margin-top: 3rem; margin-bottom: 3rem; border: 0; border-top: 1px solid #eee;" />\n<h2>Frequently Asked Questions</h2>\n` + faqHtml;
    }

    let headingWidgetTemplate: any = null;
    let textWidgetTemplate: any = null;
    let mainColumn: any = null;

    walkElements(doc, el => {
        // Assume the first column is the main content column
        if (el.elType === "column" && !mainColumn) {
            mainColumn = el;
        }
        if (el.elType === "widget") {
            if (el.widgetType === "heading" && !headingWidgetTemplate) {
                headingWidgetTemplate = el;
            }
            if (el.widgetType === "text-editor" && !textWidgetTemplate) {
                textWidgetTemplate = el;
            }
        }
    });

    if (!mainColumn) {
        throw new Error("Could not find a column in the example section template.");
    }

    const finalElements = [];

    // Use the first heading widget as a template for our title
    if (headingWidgetTemplate) {
        const clonedHeading = deepClone(headingWidgetTemplate);
        if (clonedHeading.settings) {
            clonedHeading.settings.title = title || "Scientific Article";
        }
        finalElements.push(clonedHeading);
    }
    
    // Use the first text-editor widget as a template for our article content
    if (textWidgetTemplate) {
        const clonedText = deepClone(textWidgetTemplate);
        if (clonedText.settings) {
            clonedText.settings.editor = htmlContent;
        }
        finalElements.push(clonedText);
    }

    // Replace the column's children entirely with our generated content,
    // discarding the old example article texts.
    mainColumn.elements = finalElements;

    // Finally, regenerate all IDs and strip caches for a fresh importable section
    regenerateIds(doc);
    stripRuntimeCaches(doc);

    return doc;
}
