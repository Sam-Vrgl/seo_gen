import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function main() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  const prompt = "Generate a simple illustration of a blue square.";
  const result = await model.generateContent(prompt);

  console.log(JSON.stringify(result.response, null, 2));
}

main().catch(console.error);
