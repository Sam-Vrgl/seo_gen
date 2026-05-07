import { fetchPmcPapers } from "./src/aggregator.ts"; 
fetchPmcPapers("breast cancer", 5, undefined, "2024-12-31").then(console.log);
