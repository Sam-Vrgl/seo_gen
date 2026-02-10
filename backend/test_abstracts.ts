import { app } from "./src/server";

const test = async () => {
    console.log("Testing PubMed abstract fetching...");
    
    // Search for something known to be in PubMed, with includeAbstracts=true
    const res = await app.handle(new Request("http://localhost/search?q=covid&limit=1&includePubmed=true&includeArxiv=false&includeAbstracts=true"));
    const data = await res.json() as any[];
    
    console.log(`Got ${data.length} results.`);
    if (data.length > 0) {
        const article = data[0];
        console.log(`Title: ${article.title}`);
        console.log(`Source: ${article.source}`);
        console.log(`Abstract length: ${article.abstract?.length}`);
        console.log(`Abstract preview: ${article.abstract?.slice(0, 100)}...`);
        
        if (article.source === "PubMed" && article.abstract && !article.abstract.includes("requires fetch via efetch")) {
            console.log("PASS: Abstract fetched successfully.");
        } else {
            console.log("FAIL: Abstract not fetched or incorrect source.");
        }
    } else {
        console.log("FAIL: No results found.");
    }
};

test();
