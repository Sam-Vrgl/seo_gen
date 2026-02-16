import { fetchPmcPapers, fetchPmcFullText } from './aggregator';

const test = async () => {
    console.log("Testing PMC Search...");

    // Test specific known OA PMC ID from BioC examples
    const specificId = "PMC4148386"; 
    console.log(`Testing specific ID: ${specificId}`);
    const text = await fetchPmcFullText(specificId);
    console.log(`Specific ID text length: ${text ? text.length : 'undefined'}`);

    console.log("------------------------------------------------");

    // Search for something common in PMC Open Access
    // Note: 'open access[filter]' might not work in standard esearch term without proper syntax, 
    // but 'open access[filter]' is standard PubMed syntax.
    console.log("Searching for 'crispr AND open access[filter]'...");
    const papers = await fetchPmcPapers("crispr AND open access[filter]", 2, undefined, undefined, true);
    
    console.log(`Found ${papers.length} papers.`);
    
    if (papers.length > 0) {
        const first = papers[0];
        if (first) {
            console.log("First paper:", {
                title: first.title,
                source: first.source,
                url: first.url,
                hasFullText: !!first.fullText,
                fullTextLength: first.fullText?.length
            });
        }
    } else {
        console.log("No papers found. Check search term or API.");
    }
}

test();
