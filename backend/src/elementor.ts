import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { marked, Renderer } from 'marked';

// Renderer that downgrades headings by one level so # → h2, ## → h3, etc.
// This prevents H1 conflicts since WordPress pages already have an H1 title.
const articleRenderer = new Renderer();
articleRenderer.heading = ({ text, depth }: { text: string; depth: number }) => {
    const level = Math.min(depth + 1, 6);
    return `<h${level}>${text}</h${level}>\n`;
};

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

        for (const k of Object.keys(node)) {
            if (KEY_RX.test(k)) {
                delete node[k];
                continue;
            }
            const norm = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
            if (KEY_RX.test(norm)) delete node[k];
        }

        if (node.settings && typeof node.settings === "object") {
            for (const k of Object.keys(node.settings)) {
                const norm = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
                if (KEY_RX.test(k) || KEY_RX.test(norm)) delete node.settings[k];
            }
        }

        if (Array.isArray(node.elements)) node.elements.forEach(walk);
    }

    walk(root);
    return root;
}

function findTabsWidget(root: any): any {
    let found: any = null;
    walkElements(root, el => {
        if (!found && el.elType === "widget" && el.settings && Array.isArray(el.settings.tabs)) {
            found = el;
        }
    });
    return found;
}

async function parseFaqIntoTabs(faqContent: string): Promise<Array<{tab_title: string, tab_content: string, _id: string}>> {
    const lines = faqContent.split('\n');
    const items: Array<{question: string, answerLines: string[]}> = [];
    let currentQuestion: string | null = null;
    let currentAnswerLines: string[] = [];

    for (const line of lines) {
        const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
        if (headingMatch) {
            const text = (headingMatch[1] ?? '').trim().replace(/\*\*/g, '');
            // Only treat headings that are actual questions (end with ?)
            if (text.endsWith('?')) {
                if (currentQuestion !== null) {
                    items.push({ question: currentQuestion, answerLines: currentAnswerLines });
                }
                currentQuestion = text;
                currentAnswerLines = [];
            } else if (currentQuestion !== null) {
                // Non-question heading ends the current answer block
                items.push({ question: currentQuestion, answerLines: currentAnswerLines });
                currentQuestion = null;
                currentAnswerLines = [];
            }
            // Section-title headings (no ?) before any question are silently skipped
        } else if (currentQuestion !== null) {
            currentAnswerLines.push(line);
        }
    }
    if (currentQuestion !== null && currentAnswerLines.length > 0) {
        items.push({ question: currentQuestion, answerLines: currentAnswerLines });
    }

    const tabs = await Promise.all(items.map(async ({ question, answerLines }) => ({
        tab_title: question,
        tab_content: await marked.parse(answerLines.join('\n').trim()),
        _id: shortId(7)
    })));

    return tabs;
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

    let htmlContent = await marked.parse(markdownContent, { renderer: articleRenderer });
    if (illustrationBase64) {
        const imgHtml = `<p><img src="data:image/jpeg;base64,${illustrationBase64}" style="max-width: 100%; border-radius: 8px; margin-bottom: 2rem; display: block; margin-left: auto; margin-right: auto;" /></p>\n\n`;
        htmlContent = imgHtml + htmlContent;
    }

    let headingWidgetTemplate: any = null;
    let textWidgetTemplate: any = null;
    let mainColumn: any = null;

    walkElements(doc, el => {
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

    if (headingWidgetTemplate) {
        const clonedHeading = deepClone(headingWidgetTemplate);
        if (clonedHeading.settings) {
            clonedHeading.settings.title = title || "Scientific Article";
        }
        finalElements.push(clonedHeading);
    }

    if (textWidgetTemplate) {
        const clonedText = deepClone(textWidgetTemplate);
        if (clonedText.settings) {
            clonedText.settings.editor = htmlContent;
        }
        finalElements.push(clonedText);
    }

    mainColumn.elements = finalElements;

    regenerateIds(doc);
    stripRuntimeCaches(doc);

    if (faqContent) {
        const faqSectionPath = path.join(process.cwd(), "..", "temp_faq", "section.json");
        if (!fs.existsSync(faqSectionPath)) {
            throw new Error("FAQ section template not found at " + faqSectionPath);
        }
        const faqSectionTemplate = JSON.parse(fs.readFileSync(faqSectionPath, "utf8"));

        const faqDoc = deepClone(faqSectionTemplate);
        regenerateIds(faqDoc);

        const tabsWidget = findTabsWidget(faqDoc);
        if (!tabsWidget) {
            throw new Error("No toggle widget found in section.json FAQ template.");
        }

        const tabs = await parseFaqIntoTabs(faqContent);
        tabsWidget.settings.tabs = tabs;
        delete tabsWidget.htmlCache;
        delete tabsWidget.settings?.htmlCache;
        delete tabsWidget.settings?.html_cache;

        stripRuntimeCaches(faqDoc);

        // Append the FAQ section(s) to the article doc's elements array
        for (const el of faqDoc.elements) {
            doc.elements.push(el);
        }
    }

    return doc;
}
