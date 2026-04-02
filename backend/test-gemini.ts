import { analyzeArticles } from "./src/gemini";

async function main() {
    console.log("Starting test...");
    const articles = [{
        title: "Test",
        authors: ["Me"],
        abstract: "Test article",
        url: "http",
        source: "User Upload" as "User Upload",
        published_date: "2024-01-01"
    }];
    try {
        const text = await analyzeArticles(articles, []);
        console.log("Success:");
        console.log(text);
    } catch(e) {
        console.error("Error!!");
        console.error(e);
    }
}

main().finally(() => process.exit(0));
