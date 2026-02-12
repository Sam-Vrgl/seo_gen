import { fetchArxivPapers } from "./aggregator";

console.log("Testing ArXiv PDF Fallback...");

async function test() {
    console.log("Searching for 'Attention Is All You Need' (expecting PDF fallback)...");
    try {
        const papers = await fetchArxivPapers("Attention Is All You Need authors:Vaswani", 1, undefined, undefined, true);
        
        if (papers.length === 0) {
            console.log("No papers found.");
            return;
        }

        const paper = papers[0]!;
        console.log(`Found paper: ${paper.title} (${paper.url})`);
        
        if (paper.fullText && paper.fullText.length > 500) {
            console.log(`SUCCESS: Retrieved full text (${paper.fullText.length} chars)`);
            console.log(`Preview: ${paper.fullText.substring(0, 200).replace(/\n/g, ' ')}...`);
        } else {
            console.log("FAILURE: Full text not retrieved or too short.");
        }

    } catch(e) {
        console.error("Test failed with error:", e);
    }
}

test();
