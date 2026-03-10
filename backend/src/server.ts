import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { searchAggregator } from "./aggregator";

const phrases = require("../phrases.json");

const app = new Elysia()
  .use(cors())
  .get(
    "/search",
    async ({ query }) => {
      const { q, limit, includeArxiv, includePubmed, startDate, endDate } = query;
      if (!q) {
        return [];
      }
      return await searchAggregator(q, {
        limit: limit ? parseInt(limit) : 5,
        includeArxiv: includeArxiv === undefined ? undefined : includeArxiv === 'true',
        includePubmed: includePubmed === undefined ? undefined : includePubmed === 'true',
        startDate,
        endDate,
        includeFullPapers: query.includeFullPapers === 'true'
      });
    },
    {
      query: t.Object({
        q: t.String(),
        limit: t.Optional(t.String()),
        includeArxiv: t.Optional(t.String()),
        includePubmed: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        includeFullPapers: t.Optional(t.String())
      }),
    }
  )
  .post(
    "/analyze",
    async ({ body }) => {
      const { articles } = body;
      const { analyzeArticles } = await import("./gemini");
      return await analyzeArticles(articles, phrases.phrases);
    },
    {
      body: t.Object({
        articles: t.Array(
             t.Object({
                title: t.String(),
                authors: t.Array(t.String()),
                abstract: t.String(),
                url: t.String(),
                source: t.Union([t.Literal("ArXiv"), t.Literal("PubMed"), t.Literal("User Upload")]),
                published_date: t.String()
             })
        ) 
      })
    }
  )
  .post(
    "/generate-faq",
    async ({ body }) => {
      const { article } = body;
      const { generateFaq } = await import("./gemini");
      return await generateFaq(article, phrases.phrases);
    },
    {
      body: t.Object({
        article: t.String()
      })
    }
  )
  .post(
    "/upload-pdf",
    async ({ body }) => {
      const { file } = body;
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const pdfLib = require('pdf-parse');
        const PDFParse = pdfLib.PDFParse || pdfLib.default?.PDFParse || pdfLib;
        
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        
        const text = data.text.replace(/\s+/g, ' ').trim();
        
        return {
            title: file.name,
            authors: ["User Upload"],
            abstract: text.substring(0, 300) + "...",
            url: `local-file://${file.name}`,
            source: "User Upload",
            published_date: new Date().toISOString(),
            fullText: text
        };
      } catch (error) {
        console.error("Error parsing PDF:", error);
        throw new Error("Failed to parse PDF");
      }
    },
    {
      body: t.Object({
        file: t.File()
      })
    }
  );

export type App = typeof app;
export { app };