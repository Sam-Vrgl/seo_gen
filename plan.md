# Project Proposal: AI Scientific Article Generator

**Developer:** Samuel Vergnol
**Duration:** 6 Weeks (MVP) + 2 Weeks (Optimization)
**Objective:** Build an automated pipeline that accepts a topic, researches real-time scientific data (ArXiv, PubMed, Semantic Scholar), and synthesizes a cited, SEO-optimized article.

## 1. Technical Strategy

We are moving away from a complex multi-language architecture to a unified **TypeScript** stack. This reduces development overhead and deployment complexity.

* **Runtime:** **Bun** (chosen for high-performance I/O and native TypeScript support).
* **Backend:** **ElysiaJS** (Type-safe, high-speed API framework).
* **AI Engine:** **Gemini 1.5 Pro** (Large context window allows processing multiple full-text PDFs simultaneously).
* **Data Sources:** Real-time API connections to **ArXiv, PubMed, and Semantic Scholar** (Ensures factual accuracy vs. AI hallucination).

---

## 2. Development Timeline (6-Week MVP)

### Phase 1: Core Infrastructure & Search Agent (Weeks 1-2)

**Goal:** The system can "see" the outside world and retrieve verifying data.

* **Infrastructure:** Initialize Bun/Elysia monorepo with SQLite database for job tracking.
* **Search Logic:** Develop the "Aggregator" module.
* *Input:* User Topic/Keywords.
* *Action:* Convert topic to Boolean search strings.
* *Integration:* Connect to ArXiv & PubMed APIs to fetch metadata (Abstract, Author, DOI) for the last 12 months.


* **Deliverable:** An API endpoint that accepts "CRISPR" and returns a JSON list of 20 verified, recent academic papers.

### Phase 2: The "Reader" & Content Ingestion (Weeks 3-4)

**Goal:** The system can download and "read" the full text of selected papers.

* **Filtering Engine:** Implement a Gemini-based step to select the "Top 5" most relevant papers from the search results (filtering out irrelevant matches).
* **The Scraper:** Build the fetcher logic.
* Prioritize **HTML parsing** (Cheerio) for clean text extraction from Open Access sources.
* Fallback to **PDF parsing** (pdf-parse) only when necessary.


* **Data Cleaning:** Normalization scripts to remove headers, footers, and bibliography noise before feeding text to the AI.
* **Deliverable:** The system successfully extracts raw text from 5 external URLs and prepares it for the Context Window.

### Phase 3: The "Writer" & Synthesis (Week 5)

**Goal:** The core value proposition—turning research into a structured article.

* **Context Injection:** Feed the cleaned text from Phase 2 into Gemini 1.5 Pro.
* **Drafting Logic:**
* Create "System Prompts" that enforce citation rules (e.g., "Must cite source [1] when making a claim").
* Implement "Sectioning" (Intro, Methodology, Discussion) to ensure depth.


* **SEO Layer:** Post-processing step to inject user-defined keywords naturally into headers and meta-descriptions.
* **Deliverable:** A generated, scientifically accurate article with inline citations linking back to the source PDFs.

### Phase 4: Interface & MVP Polish (Week 6)

**Goal:** A usable tool for the end-user.

* **Frontend:** Build a clean React/Vite interface based on the whiteboard design.
* Inputs: Topic, Keywords, Forbidden Characters, Style.
* Outputs: Markdown editor/viewer, PDF export.


* **Testing:** End-to-end testing of the pipeline (Search -> Fetch -> Write).
* **Deliverable:** **Launch-ready MVP.**

---

## 3. Post-MVP / Optimization (Weeks 7-8)

*Optional features to be implemented after the core pipeline is stable.*

* **Anti-Detection (Humanizer):** Integration of "GPTZero" checks and "Humanizer" rewriting loops. *Note: Pushed to end due to high volatility of detection algorithms.*
* **Image Generation:** Integrating Nano Banana/DALL-E to generate relevant scientific diagrams or cover images based on article content.
* **Paywall Handling:** Advanced logic to handle restricted journals (extracting data from Abstract/Intro only).

## 4. Resource Requirements

* **API Access:**
* Google Gemini API (Paid Tier for high rate limits).
* Semantic Scholar API (Free tier usually sufficient for dev).


* **Server:** Local development environment (Mac/Linux preferred for Bun).

## 5. Risk Assessment

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **PDF Parsing Errors** | High | Prioritize HTML/XML sources (ArXiv/HTML) over PDFs. |
| **API Rate Limits** | Medium | Implement request caching (SQLite) and queuing. |
| **AI Hallucinations** | Medium | Strict "Grounding" prompts: AI explicitly instructed to *only* use provided context. |

---

**Approval Request:**
I recommend proceeding with the **Bun/TypeScript** stack to maximize performance and unify the codebase. May I begin Phase 1 setup?