
import { searchAggregator } from "./src/aggregator";

const topics = ["Machine Learning", "Quantum Computing", "Bioinformatics", "Climate Change", "Neuroscience"];
const randomTopic = topics[Math.floor(Math.random() * topics.length)] ?? "Machine Learning";

console.log(`Fetching publications for topic: ${randomTopic}...`);

try {
    const results = await searchAggregator(randomTopic);
    console.log(`Found ${results.length} publications.`);
    if (results.length > 0) {
        console.log("First publication:");
        console.log(JSON.stringify(results[0], null, 2));
    }
} catch (error) {
    console.error("Error fetching publications:", error);
}
