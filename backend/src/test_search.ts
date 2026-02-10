import { fetchArxivPapers, fetchPubmedPapers } from "./aggregator";

async function test() {
  console.log("Testing ArXiv fetch...");
  const arxivPapers = await fetchArxivPapers("machine learning");
  console.log("ArXiv Papers:", arxivPapers);

  console.log("\nTesting PubMed fetch...");
  const pubmedPapers = await fetchPubmedPapers("asthma");
  console.log("PubMed Papers:", JSON.stringify(pubmedPapers, null, 2));
}

test();
