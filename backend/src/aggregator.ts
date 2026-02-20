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
  source: "ArXiv" | "PubMed" | "User Upload";
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

        const htmlUrl = `https://arxiv.org/html/${arxivId}`;
        console.log(`Fetching HTML fetching for ${arxivId} at ${htmlUrl}`);
        const response = await fetch(htmlUrl);
        
        if (!response.ok) {
            console.warn(`Failed to fetch HTML for ${arxivId}: ${response.status}`);
            return undefined;
        }

        const html = await response.text();
        const $ = load(html);
        
        let content = $('.ltx_page_main').text();
        
        if (!content || content.length < 500) {
             content = $('body').text();
        }

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
          fullText = await fetchArxivHtml(entry.id);
          
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

export const fetchPmcFullText = async (pmcId: string): Promise<string | undefined> => {
    try {
        const cleanId = pmcId.startsWith('PMC') ? pmcId : `PMC${pmcId}`;
        const url = `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/${cleanId}/unicode`;
        
        console.log(`Fetching PMC full text for ${cleanId} at ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            console.warn(`Failed to fetch BioC JSON for ${cleanId}: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.warn(`Response body: ${text.substring(0, 200)}`);
            return undefined;
        }

        const data = (await response.json()) as any;
        const collection = Array.isArray(data) ? data[0] : data;
        
        if (!collection || !collection.documents || collection.documents.length === 0) {
            console.warn(`No documents found in BioC response for ${cleanId}`);
            return undefined; 
        }

        let fullText = "";
        for (const doc of collection.documents) {
            if (doc.passages) {
                for (const passage of doc.passages) {
                    if (passage.text) {
                        fullText += passage.text + "\n\n";
                    }
                }
            }
        }
        
        return fullText.trim();
    } catch (error) {
        console.error(`Error fetching PMC full text for ${pmcId}:`, error);
        return undefined;
    }
}

export const fetchPmcPapers = async (query: string, limit: number = 5, startDate?: string, endDate?: string, fetchFullText: boolean = false): Promise<Article[]> => {
  try {
    let dateParams = "";
    if (startDate) dateParams += `&mindate=${startDate.replace(/-/g, "/")}`;
    if (endDate) dateParams += `&maxdate=${endDate.replace(/-/g, "/")}`;

    const searchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(
        query
      )}&retmode=json&retmax=${limit}${dateParams}`
    );
    const searchData = (await searchResponse.json()) as PubMedSearchResponse;
    const ids = searchData.esearchresult.idlist;

    if (!ids || ids.length === 0) return [];

    const summaryResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${ids.join(
        ","
      )}&retmode=json`
    );
    const summaryData = (await summaryResponse.json()) as PubMedSummaryResponse;
    const result = summaryData.result;

    const papers = ids.map((id: string) => result[id]);

    const papersWithText = await Promise.all(papers.map(async (paper: any) => {
        let fullText: string | undefined = undefined;
        if (fetchFullText) {
            fullText = await fetchPmcFullText(paper.uid);
        }

        return {
          title: paper.title,
          authors: paper.authors ? paper.authors.map((a: any) => a.name) : [],
          abstract: "Abstract available in full text or via BioC", 
          url: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${paper.uid}/`,
          source: "PubMed",
          published_date: paper.pubdate,
          fullText: fullText
        } as Article;

    }));

    return papersWithText;
  } catch (error) {
    console.error("Error fetching from PMC:", error);
    return [];
  }
};

export interface SearchOptions {
    limit?: number;
    includeArxiv?: boolean;
    includePubmed?: boolean;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    includeFullPapers?: boolean;
}

export const searchAggregator = async (query: string, options: SearchOptions = {}): Promise<Article[]> => {
    const { 
        limit = 5, 
        includeArxiv = true, 
        includePubmed = true,
        startDate,
        endDate,
        includeFullPapers = false
    } = options;

    const promises: Promise<Article[]>[] = [];

    if (includeArxiv) {
        promises.push(fetchArxivPapers(query, limit, startDate, endDate, includeFullPapers));
    }
    
    if (includePubmed) {
        promises.push(fetchPmcPapers(query, limit, startDate, endDate, includeFullPapers));
    }

    const results = await Promise.all(promises);
    return results.flat();
}
