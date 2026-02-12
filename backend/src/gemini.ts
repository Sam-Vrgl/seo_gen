import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Article } from "./aggregator";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const analyzeArticles = async (articles: Article[], phrases: string[]): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  if (articles.length === 0) {
    return "No articles to analyze.";
  }

  const articlesToAnalyze = articles.slice(0, 10);

  const prompt = `
You are an expert researcher writing scientific articles for a biotech company. Here are summaries of recent papers in the field. 
Please provide an SEO optimized article based on these papers to boost the company's SEO ranking. Aim for a length of 2000 words.

The article should be written in a scientific style, with proper citations and references.
Do not add any claims, definitions, or context not explicitly supported by the source text.


Writing Style and Tone

Tone: Maintain a calm, confident, and non-promotional tone. Avoid enthusiasm and "sales" language.

Voice: Use the passive voice.

Language: Use clear, direct language with simple British spelling.

Readability: Target a Flesch readability score of 50 or higher.

Vocabulary: Avoid complex jargon, adverbs, and buzzwords as well as superlatives.

Punctuation:

Do not use em dashes. Commas, colons, or parentheses may be used as substitutes.

Do not use ellipses (...) or exclamation marks (!).


Here are the papers:
${articlesToAnalyze.map((a, i) => `
${i + 1}. **${a.title}**
   - Authors: ${a.authors.join(", ")}
   - Published: ${a.published_date}
   - Source: ${a.source}
   - Content: ${a.fullText ? `[FULL TEXT EXTRACT]\n${a.fullText.slice(0, 30000)}...` : `[ABSTRACT]\n${a.abstract}`}
`).join("\n")}
Avoid using the phrases in the list below:
${phrases.join(", ")}
This check must be case-insensitive and match whole words or phrases, including common inflections.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error analyzing articles with Gemini:", error);
    throw new Error("Failed to analyze articles");
  }
};
