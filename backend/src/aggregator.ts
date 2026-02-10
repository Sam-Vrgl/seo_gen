import { XMLParser } from "fast-xml-parser";

export interface Article {
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  source: "ArXiv" | "PubMed";
  published_date: string;
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix : "@_"
});

const formatDateForArxiv = (dateStr: string): string => {
    return dateStr.replace(/-/g, "") + "0000";
};

export const fetchArxivPapers = async (query: string, limit: number = 5, startDate?: string, endDate?: string): Promise<Article[]> => {
  try {
    let searchQuery = `all:${encodeURIComponent(query)}`;
    
    if (startDate || endDate) {
        const start = startDate ? formatDateForArxiv(startDate) : "000000000000";
        const end = endDate ? formatDateForArxiv(endDate) + "2359" : new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 12);
        
        searchQuery += `+AND+submittedDate:[${start}+TO+${end}]`;
    }

    const response = await fetch(
      `http://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=${limit}`
    );
    const xml = await response.text();
    const result = parser.parse(xml);

    const entries = result.feed.entry;
    if (!entries) return [];
    
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    return entriesArray.map((entry: any) => ({
      title: entry.title.replace(/\n/g, " ").trim(),
      authors: Array.isArray(entry.author) 
        ? entry.author.map((a: any) => a.name) 
        : [entry.author.name],
      abstract: entry.summary.replace(/\n/g, " ").trim(),
      url: entry.id,
      source: "ArXiv",
      published_date: entry.published,
    }));
  } catch (error) {
    console.error("Error fetching from ArXiv:", error);
    return [];
  }
};

interface PubMedSearchResponse {
  esearchresult: {
    idlist: string[];
  };
}

interface PubMedSummaryResponse {
  result: {
    [key: string]: any;
    uids: string[];
  };
}

export const fetchPubmedPapers = async (query: string, limit: number = 5, startDate?: string, endDate?: string, fetchAbstracts: boolean = false): Promise<Article[]> => {
  try {
    let dateParams = "";
    if (startDate) dateParams += `&mindate=${startDate.replace(/-/g, "/")}`;
    if (endDate) dateParams += `&maxdate=${endDate.replace(/-/g, "/")}`;

    // Step 1: Search for IDs
    const searchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
        query
      )}&retmode=json&retmax=${limit}${dateParams}`
    );
    const searchData = (await searchResponse.json()) as PubMedSearchResponse;
    const ids = searchData.esearchresult.idlist;

    if (!ids || ids.length === 0) return [];

    // Step 2: Fetch summary details for IDs
    const summaryResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(
        ","
      )}&retmode=json`
    );
    const summaryData = (await summaryResponse.json()) as PubMedSummaryResponse;
    const result = summaryData.result;

    // Remove the 'uids' list from the result object to iterate over papers
    const papers = ids.map((id: string) => result[id]);

    let abstracts: Record<string, string> = {};
    if (fetchAbstracts) {
        try {
            const efetchResponse = await fetch(
                `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml`
            );
            const xml = await efetchResponse.text();
            const parsed = parser.parse(xml);
            
            const articles = parsed.PubmedArticleSet?.PubmedArticle;
            if (articles) {
                const articleList = Array.isArray(articles) ? articles : [articles];
                articleList.forEach((a: any) => {
                    const pmid = a.MedlineCitation?.PMID;
                    // Handle PMID as object or string (parser might wrap it)
                    const pmidStr = typeof pmid === 'object' && pmid['#text'] ? pmid['#text'] : pmid;
                    
                    const abstractText = a.MedlineCitation?.Article?.Abstract?.AbstractText;
                    
                    if (pmidStr && abstractText) {
                        let text = "";
                        if (Array.isArray(abstractText)) {
                            text = abstractText.map((t: any) => {
                                if (typeof t === 'string') return t;
                                if (typeof t === 'object') {
                                    const label = t['@_Label'] ? `${t['@_Label']}: ` : '';
                                    return label + (t['#text'] || '');
                                }
                                return '';
                            }).join(" ");
                        } else if (typeof abstractText === 'object') {
                            const label = abstractText['@_Label'] ? `${abstractText['@_Label']}: ` : '';
                            text = label + (abstractText['#text'] || '');
                        } else {
                            text = String(abstractText);
                        }
                        abstracts[String(pmidStr)] = text;
                    }
                });
            }
        } catch (e) {
            console.error("Failed to fetch abstracts", e);
        }
    }

    return papers.map((paper: any) => ({
      title: paper.title,
      authors: paper.authors ? paper.authors.map((a: any) => a.name) : [],
      abstract: abstracts[paper.uid] || "Abstract not available in summary - requires fetch via efetch",
      url: `https://pubmed.ncbi.nlm.nih.gov/${paper.uid}/`,
      source: "PubMed",
      published_date: paper.pubdate,
    }));
  } catch (error) {
    console.error("Error fetching from PubMed:", error);
    return [];
  }
};

export interface SearchOptions {
    limit?: number;
    includeArxiv?: boolean;
    includePubmed?: boolean;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    includeAbstracts?: boolean;
}

export const searchAggregator = async (query: string, options: SearchOptions = {}): Promise<Article[]> => {
    const { 
        limit = 5, 
        includeArxiv = true, 
        includePubmed = true,
        startDate,
        endDate,
        includeAbstracts = false
    } = options;

    const promises: Promise<Article[]>[] = [];

    if (includeArxiv) {
        promises.push(fetchArxivPapers(query, limit, startDate, endDate));
    }
    
    if (includePubmed) {
        promises.push(fetchPubmedPapers(query, limit, startDate, endDate, includeAbstracts));
    }

    const results = await Promise.all(promises);
    return results.flat();
}
