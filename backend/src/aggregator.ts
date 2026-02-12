import { XMLParser } from "fast-xml-parser";
import { load } from 'cheerio';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfLib = require('pdf-parse');
const PDFParse = pdfLib.PDFParse || pdfLib.default?.PDFParse;

export interface Article {
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  source: "ArXiv" | "PubMed";
  published_date: string;
  fullText?: string;
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix : "@_"
});

const formatDateForArxiv = (dateStr: string): string => {
    return dateStr.replace(/-/g, "") + "0000";
};

const fetchArxivHtml = async (idUrl: string): Promise<string | undefined> => {
    try {
        const arxivId = idUrl.split('/abs/').pop();
        if (!arxivId) return undefined;

        // Try to fetch HTML view
        const htmlUrl = `https://arxiv.org/html/${arxivId}`;
        console.log(`Fetching HTML fetching for ${arxivId} at ${htmlUrl}`);
        const response = await fetch(htmlUrl);
        
        if (!response.ok) {
            console.warn(`Failed to fetch HTML for ${arxivId}: ${response.status}`);
            return undefined;
        }

        const html = await response.text();
        const $ = load(html);
        
        // ArXiv HTML usually has content in specific classes
        // .ltx_page_main is a common container for the converted LaTeX
        let content = $('.ltx_page_main').text();
        
        if (!content || content.length < 500) {
             // Fallback to body if specific class not found or too short
             content = $('body').text();
        }

        // Clean up: remove excessive whitespace
        return content.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error("Error fetching ArXiv HTML:", error);
        return undefined;
    }
}

const fetchArxivPdf = async (idUrl: string): Promise<string | undefined> => {
    try {
        const arxivId = idUrl.split('/abs/').pop();
        if (!arxivId) return undefined;

        const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
        console.log(`Fetching PDF for ${arxivId} at ${pdfUrl}`);
        
        const response = await fetch(pdfUrl);
        if (!response.ok) {
            console.warn(`Failed to fetch PDF for ${arxivId}: ${response.status}`);
            return undefined;
        }

        const buffer = await response.arrayBuffer();
        const parser = new PDFParse({ data: Buffer.from(buffer) });
        const data = await parser.getText();
        
        // Basic cleanup
        return data.text.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error("Error fetching ArXiv PDF:", error);
        return undefined;
    }
}

export const fetchArxivPapers = async (query: string, limit: number = 5, startDate?: string, endDate?: string, includeFullPapers: boolean = false): Promise<Article[]> => {
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

    const papers = await Promise.all(entriesArray.map(async (entry: any) => {
      let fullText: string | undefined = undefined;
      if (includeFullPapers) {
          // Try HTML first
          fullText = await fetchArxivHtml(entry.id);
          
          // Fallback to PDF if HTML failed
          if (!fullText) {
              console.log(`HTML fetch failed for ${entry.id}, trying PDF fallback...`);
              fullText = await fetchArxivPdf(entry.id);
          }
      }

      return {
        title: entry.title.replace(/\n/g, " ").trim(),
        authors: Array.isArray(entry.author) 
          ? entry.author.map((a: any) => a.name) 
          : [entry.author.name],
        abstract: entry.summary.replace(/\n/g, " ").trim(),
        url: entry.id,
        source: "ArXiv",
        published_date: entry.published,
        fullText
      } as Article;
    }));

    return papers;
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
    includeFullPapers?: boolean;
}

export const searchAggregator = async (query: string, options: SearchOptions = {}): Promise<Article[]> => {
    const { 
        limit = 5, 
        includeArxiv = true, 
        includePubmed = true,
        startDate,
        endDate,
        includeAbstracts = false,
        includeFullPapers = false
    } = options;

    const promises: Promise<Article[]>[] = [];

    if (includeArxiv) {
        promises.push(fetchArxivPapers(query, limit, startDate, endDate, includeFullPapers));
    }
    
    if (includePubmed) {
        promises.push(fetchPubmedPapers(query, limit, startDate, endDate, includeAbstracts));
    }

    const results = await Promise.all(promises);
    return results.flat();
}
