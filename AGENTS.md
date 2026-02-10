# Project Context: AI Scientific Article Generator

## Environment
this project runs in a windows environment. Use windows commands to run the project.

## 1. Project Mission
We are building a **Bun-first, TypeScript-only** web application that acts as an autonomous scientific research agent.
**Core Loop:** User Input (Topic) → Search External APIs (ArXiv, PubMed) → Filter Results → Fetch Full Text (HTML/PDF) → LLM Synthesis → Final Markdown Article.

---

## 2. Tech Stack (Strict Constraints)
* **Runtime:** `Bun` (v1.x+). Do NOT use Node.js or npm. Use `bun install`, `bun run`.
* **Language:** `TypeScript` (Strict mode).
* **Backend Framework:** `ElysiaJS` (Eden Treaty for type safety).
* **Database:** `bun:sqlite` (Native SQLite).
* **Frontend:** `React` + `Vite` + `TailwindCSS`.
* **AI/LLM:** Google Gemini API (Model: `gemini-1.5-pro` for reasoning, `gemini-1.5-flash` for dev/speed).
* **External APIs:** Semantic Scholar, PubMed (E-utils), ArXiv.
* **NO PYTHON:** All logic, including text parsing, must be done in TypeScript.

---

## 3. Architecture & Data Flow

### A. The "Researcher" (Search Agent)
* **Input:** User query string (e.g., "CRISPR off-target").
* **Action:** Convert to boolean queries -> Fetch metadata from APIs.
* **Output:** Normalized JSON array of `Paper` objects.
* **Tools:** `fetch()`, `xml2js` (for PubMed/ArXiv responses).

### B. The "Reader" (Content Fetcher)
* **Input:** List of selected URLs/DOIs.
* **Action:**
    1.  Try fetching HTML content first (Cheerio scraping).
    2.  Fallback to PDF binary fetch -> Text Extraction (`pdf-parse` or similar JS lib).
* **Output:** Cleaned raw text string.

### C. The "Writer" (Synthesis Agent)
* **Input:** Raw text context + User Style constraints.
* **Action:** Prompt Engineering -> Stream response to client.
* **Output:** Markdown formatted text with inline citations `[1]`.

---

## 4. Coding Standards & Patterns
1.  **Functional over OOP:** Prefer pure functions and composition.
2.  **Type Safety:** Share types between Backend (Elysia) and Frontend via `Eden Treaty`.
3.  **Error Handling:** Use `try/catch` blocks explicitly. Wrap external API calls in retry logic (exponential backoff).
4.  **Environment:** Use `Bun.env` for API keys.
5.  **File Structure:**
    ```
    /src
      /backend
        /agents       # Logic for Search/Read/Write
        /db           # SQLite schemas
        server.ts     # Elysia entry
      /frontend
        /components
        App.tsx
      /shared         # Shared TS interfaces
    ```

---

## 5. API Reference (For AI Context)

### Semantic Scholar (Graph API)
* **Endpoint:** `https://api.semanticscholar.org/graph/v1/paper/search`
* **Params:** `query`, `limit`, `fields=title,abstract,year,citationCount,isOpenAccess`

### PubMed (E-Utilities)
* **Base:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
* **Flow:**
    1.  `esearch.fcgi?db=pubmed&term=...&retmode=json` (Returns IDs)
    2.  `efetch.fcgi?db=pubmed&id=...&retmode=xml` (Returns Abstracts)

### ArXiv
* **Endpoint:** `http://export.arxiv.org/api/query?search_query=all:...`
* **Format:** Returns Atom XML (needs parsing).

---

## 6. Current Development Phase: MVP
* **Focus:** Establish the end-to-end pipeline.
* **Ignore:** Auth, User Accounts, Payment Gateways, complex PDF OCR (use text-layer extraction only).
* **Mocking:** If API limits are hit, mock the "Search" response with `mock/papers.json`.