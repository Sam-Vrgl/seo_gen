import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Article } from "./aggregator";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export const analyzeArticles = async (articles: Article[], phrases: string[]): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  if (articles.length === 0) {
    return "No articles to analyze.";
  }
  // if(main_prompt === "" || null || undefined) {
  //   throw new Error("main_prompt or phrases is not set");
  // }

  const articlesToAnalyze = articles.slice(0, 10);

  const prompt =  `

  You are a human expert researcher writing scientific articles for a biotech company. Here are summaries of recent papers in the field. 
Please provide an SEO optimized article based on these papers to boost the company's SEO ranking. Aim for a length of 2000 words.

Define each abbreviation and acronym the first time it is used.

Instead of placing references in text place a number in brackets at the end of the relevant sentence or paragraph, e.g. [1].
The number should correspond to the number of the paper in the reference list,
Do not over reference, use a article reference at most 4-5 times.

The article should be written in a scientific style, with proper citations and references.
Do not add any claims, definitions, or context not explicitly supported by the source text.

Always start the article with a title.

Writing Style and Tone

Style: Write as a human expert researcher.

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
   - Content: ${a.fullText ? `[FULL TEXT EXTRACT]\n${a.fullText.slice(0, 10000)}...` : `[ABSTRACT]\n${a.abstract}`}
`).join("\n")}
Avoid using the phrases in the list below:
${phrases.join(", ")}
This check must be case-insensitive and match whole words or phrases, including common inflections.
`;
  console.log(prompt.substring(0, 300).replace(/\n/g, ' ') + '...');
  try {
    console.log('[Gemini] Sending generateContent request (analyzeArticles)...');
    console.log(`[Gemini] Prompt length: ${prompt.length} characters (approx. ${Math.round(prompt.length / 4)} tokens).`);
    console.log('[Gemini] Waiting for Gemini API to process... This may take up to 60 seconds for large full-text contexts.');
    console.time('[Gemini] API Response Time');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    console.timeEnd('[Gemini] API Response Time');
    console.log('[Gemini] Received response (analyzeArticles).');
    console.log('[Gemini] Response snippet:', response.text().substring(0, 300).replace(/\n/g, ' ') + '...');
    
    if (process.env.LIST_TOKEN_USE === 'true') {
      const tokenUsage = response.usageMetadata;
      if (tokenUsage) {
        console.log("=== Gemini Token Usage ===");
        console.log(`Prompt Tokens: ${tokenUsage.promptTokenCount}`);
        console.log(`Candidate Tokens: ${tokenUsage.candidatesTokenCount}`);
        console.log(`Total Tokens: ${tokenUsage.totalTokenCount}`);
        console.log('============================');
        console.log(tokenUsage);
        console.log('============================');
      }
    }

    return response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Gemini] Error analyzing articles:", message);
    throw new Error(`Failed to analyze articles: ${message}`);
  }
};

export const generateFaq = async (article: string, phrases: string[]): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const prompt = `
Generate exactly 10 FAQ items.

Source Material and Content

The only source for all content must be the main body text of the article provided below.

<article_text>
${article}
</article_text>

Do not add any claims, definitions, or context not explicitly supported by the source text.

All content must be paraphrased.

Exception: Scientific names, measurements, and gene or protein labels may be quoted verbatim only if they appear in the source.

Writing Style and Tone

Tone: Maintain a calm, confident, and non-promotional tone. Avoid enthusiasm and "sales" language.

Voice: Use the passive voice.

Language: Use clear, direct language with simple British spelling.

Readability: Target a Flesch readability score of 50 or higher.

Vocabulary: Avoid complex jargon, adverbs, and buzzwords.

Formatting and Structure

Questions:

Keep questions concise (1–2 sentences) and vary their lengths.

Inclusive "we" phrasing (e.g., "How can we use...") is permitted.

Answers:

Each answer must be 100–150 words.

Vary the specific lengths of the answers across the 10 items (e.g., one 105 words, one 140 words).

Within each answer, sentence lengths must alternate (mix short and long sentences) to support high readability.

"We" may be used occasionally in answers if it reflects shared practice or reasoning.

Constraints and Forbidden Content

Punctuation:

Do not use em dashes. Commas, colons, or parentheses may be used as substitutes.

Do not use ellipses (...) or exclamation marks (!).

Forbidden Terms:

The blocklist from ai_phrases.json must be loaded and strictly enforced.

This check must be case-insensitive and match whole words or phrases, including common inflections.

If a forbidden term appears in the source text, it must be rephrased neutrally or omitted.

Forbidden Terms List:
${phrases.join(", ")}
`;

  try {
    console.log('[Gemini] Sending generateContent request (generateFaq)...');
    console.log('[Gemini] Prompt snippet:', prompt.substring(0, 300).replace(/\n/g, ' ') + '...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log('[Gemini] Received response (generateFaq).');
    console.log('[Gemini] Response snippet:', response.text().substring(0, 300).replace(/\n/g, ' ') + '...');
    
    if (process.env.LIST_TOKEN_USE === 'true') {
      const tokenUsage = response.usageMetadata;
      if (tokenUsage) {
        console.log("=== Gemini Token Usage (FAQ) ===");
        console.log(`Prompt Tokens: ${tokenUsage.promptTokenCount}`);
        console.log(`Candidate Tokens: ${tokenUsage.candidatesTokenCount}`);
        console.log(`Total Tokens: ${tokenUsage.totalTokenCount}`);
        console.log('============================');
      }
    }

    return response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Gemini] Error generating FAQ:", message);
    throw new Error(`Failed to generate FAQ: ${message}`);
  }
};

export const generateIllustration = async (article: string): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  // Create a descriptive prompt for the image. We limit the article length
  // to avoid very large payloads, focusing on the core concepts.
  const prompt = `
  Generate a detailed scientific illustration based on the following article content: ${article.substring(0, 1500)}.


Style and Layout Instructions:

- Composition: Organize the image into 3 distinct, vertical panels. Each panel should focus on one primary theme from the text.

- Visual Style: Clean "Modern Medical Textbook" aesthetic. Use a neutral or off-white background with a professional color palette (muted blues, teals, and greys).

- Content Density: Banner-style. Prioritize clear, high-quality central illustrations over complex diagrams. Avoid cluttered flowcharts or dense data plots.

- Labelling: Minimal text. Include one short title (2-4 words) per panel and no more than 2-3 simple labels per panel, make sure to not repeat labels. Ensure text is legible in a clean sans-serif font.

- Technical Detail: Focus on 1-2 key anatomical or molecular features per panel (e.g., a specific organ or a simplified DNA strand).

- Strict Constraint: No science-fiction elements, neon glows, or hyper-complex infographic matrices. Aim for the clarity and elegance of a Nature or Science journal figure.
  `;

  try {
     const imagenModel = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-image-preview",
     });

    console.log('[Gemini] Sending generateContent request (generateIllustration)...');
    console.log('[Gemini] Prompt snippet:', prompt.substring(0, 300).replace(/\n/g, ' ') + '...');
    const result = await imagenModel.generateContent(prompt);
    console.log('[Gemini] Received response (generateIllustration).');
    
    // The SDK returns image data in the parts array if it's an image model
    const parts = result.response.candidates?.[0]?.content?.parts;
    
    // Find the first part that contains inlineData (the image)
    const imagePart = parts?.find(p => p.inlineData && p.inlineData.data);
    const responseData = imagePart?.inlineData?.data;
    
    if (!responseData) {
      console.log("=== SDK Response for Image ===");
      console.log(JSON.stringify(result.response, null, 2));
      console.log("==============================");
      throw new Error("No image data returned from Gemini SDK");
    }

    return String(responseData);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Gemini] Error generating illustration:", message);
    throw new Error(`Failed to generate illustration: ${message}`);
  }
};
