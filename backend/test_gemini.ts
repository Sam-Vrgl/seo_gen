import { GoogleGenerativeAI } from "@google/generative-ai";

const run = async () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  console.log("Sending small test prompt to Gemini...");
  console.time("Gemini Response Time");
  try {
    const result = await model.generateContent("Hello, are you receiving this? Just reply 'Yes'.");
    const response = await result.response;
    console.log("Response:", response.text());
  } catch (err) {
    console.error("Error:", err);
  }
  console.timeEnd("Gemini Response Time");
};

run();
