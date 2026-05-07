import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Article } from "./aggregator";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export const analyzeArticles = async (articles: Article[], phrases: string[], focusKeyphrase?: string): Promise<string> => {
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

  const promptBase = await Bun.file(import.meta.dir + "/prompt.txt").text();

  const prompt = `
${promptBase}

Here are the papers:
${articlesToAnalyze.map((a, i) => `
${i + 1}. **${a.title}**
   - Authors: ${a.authors.join(", ")}
   - Published: ${a.published_date}
   - Source: ${a.source}
   - Content: ${a.fullText ? `[FULL TEXT EXTRACT]\n${a.fullText.slice(0, 10000)}...` : `[ABSTRACT]\n${a.abstract}`}
`).join("\n")}
${focusKeyphrase ? `
SEO Focus Keyphrase: "${focusKeyphrase}"
Include this keyphrase in the article title and in the introduction paragraph. Use it naturally 2–3 times in the body of the article.
` : ''}Avoid using the phrases in the list below:
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

  const promptBase = await Bun.file(import.meta.dir + "/faq_prompt.txt").text();
  const prompt = promptBase
    .replace("{{ARTICLE}}", article)
    .replace("{{PHRASES}}", phrases.join(", "));

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

  const promptBase = await Bun.file(import.meta.dir + "/image_prompt.txt").text();
  const prompt = promptBase.replace("{{ARTICLE_EXCERPT}}", article.substring(0, 1500));

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

export const generateSeoMeta = async (article: string): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const promptBase = await Bun.file(import.meta.dir + "/seo_meta_prompt.txt").text();
  const prompt = promptBase.replace("{{ARTICLE}}", article);

  try {
    console.log('[Gemini] Sending generateContent request (generateSeoMeta)...');
    console.log('[Gemini] Prompt snippet:', prompt.substring(0, 300).replace(/\n/g, ' ') + '...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log('[Gemini] Received response (generateSeoMeta).');
    console.log('[Gemini] Response snippet:', response.text().substring(0, 300).replace(/\n/g, ' ') + '...');
    
    if (process.env.LIST_TOKEN_USE === 'true') {
      const tokenUsage = response.usageMetadata;
      if (tokenUsage) {
        console.log("=== Gemini Token Usage (SEO Meta) ===");
        console.log(`Prompt Tokens: ${tokenUsage.promptTokenCount}`);
        console.log(`Candidate Tokens: ${tokenUsage.candidatesTokenCount}`);
        console.log(`Total Tokens: ${tokenUsage.totalTokenCount}`);
        console.log('============================');
      }
    }

    // Clean up potential quotes generated by the model despite instructions
    let meta = response.text().trim();
    if (meta.startsWith('"') && meta.endsWith('"')) {
      meta = meta.slice(1, -1);
    }
    
    return meta;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Gemini] Error generating SEO meta:", message);
    throw new Error(`Failed to generate SEO meta: ${message}`);
  }
};
