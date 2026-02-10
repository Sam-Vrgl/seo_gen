import { app } from "./src/server";

const test = async () => {
    console.log("Testing /search endpoint...");
    const response = await app.handle(new Request("http://localhost/search?q=machine+learning"));
    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Data:", JSON.stringify(data, null, 2));

    if (response.status === 200 && Array.isArray(data)) {
        console.log("Test PASSED");
    } else {
        console.log("Test FAILED");
        process.exit(1);
    }
};

test();
