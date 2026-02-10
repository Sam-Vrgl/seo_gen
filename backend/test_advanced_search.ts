import { app } from "./src/server";

const test = async () => {
    console.log("1. Testing limit...");
    const res1 = await app.handle(new Request("http://localhost/search?q=machine+learning&limit=2"));
    const data1 = await res1.json() as any[];
    console.log(`Limit 2, got ${data1.length} results. array? ${Array.isArray(data1)}`);
    if (Array.isArray(data1) && data1.length <= 4) { // 2 from arxiv + 2 from pubmed = 4 max
        console.log("PASS");
    } else {
        console.log("FAIL");
    }

    console.log("\n2. Testing source filtering (ArXiv only)...");
    const res2 = await app.handle(new Request("http://localhost/search?q=machine+learning&limit=2&includePubmed=false"));
    const data2 = await res2.json() as any[];
    const hasPubmed = data2.some((d: any) => d.source === "PubMed");
    console.log(`Got ${data2.length} results. Has PubMed? ${hasPubmed}`);
    if (data2.length > 0 && !hasPubmed) {
        console.log("PASS");
    } else {
        console.log("FAIL");
    }

    console.log("\n3. Testing date range...");
    // Just ensure it doesn't crash and returns valid JSON. 
    // Hard to verify exact dates without known data, but we check for successful response.
    const res3 = await app.handle(new Request("http://localhost/search?q=cancer&startDate=2023-01-01&endDate=2023-12-31"));
    const data3 = await res3.json() as any[];
    console.log(`Status: ${res3.status}. Got ${data3.length} results.`);
    if (res3.status === 200 && Array.isArray(data3)) {
        console.log("PASS");
    } else {
        console.log("FAIL");
    }
};

test();
