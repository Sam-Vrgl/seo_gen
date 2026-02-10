# Next Steps: Gemini Integration for Article Analysis

This document outlines the steps to integrate Google Gemini to analyze and recap the fetched research papers.

## 1. Setup & Configuration
- [ ] **Get API Key**: Obtain a Google Cloud API key with access to Gemini (Vertex AI or AI Studio).
- [ ] **Environment Variable**: Add `GEMINI_API_KEY` to `.env` in the backend.
- [ ] **Install SDK**: Install the official SDK in the backend:
  ```bash
  bun add @google/generative-ai
  ```

## 2. Backend Implementation
- [ ] **Create Gemini Service**:
  - Create `src/gemini.ts`.
  - Initialize the model (e.g., `gemini-1.5-flash` or `gemini-pro`).
  - Create a function `analyzeArticles(articles: Article[]): Promise<string>`.
- [ ] **Prompt Engineering**:
  - Design a prompt that feeds the titles and abstracts of the articles to Gemini.
  - Ask for a synthesis of the field, key trends, and individual significance.
  - *Example Prompt*: "You are an expert researcher. Here are summaries of recent papers in [Topic]. Please provide a comprehensive overview of the current state of this field based *only* on these papers, highlighting key innovations and common themes."
- [ ] **API Endpoint**:
  - Create a new route `POST /analyze`.
  - It should accept the `SearchOptions` or the retrieved articles to contextually generate the summary.
  - Return the generated markdown text.

## 3. Frontend Integration
- [ ] **UI Update**:
  - Add a "Summarize Findings" button near the search results.
  - Show a loading state (Gemini can take a few seconds).
  - Display the result (Markdown rendering recommended, e.g., using `react-markdown`).
- [ ] **State Management**:
  - Store the analysis result in a new state variable.

## 4. Refinement
- [ ] **Context Window Management**: Ensure we don't exceed token limits if many abstracts are sent (truncate if necessary).
- [ ] **Stream Response**: Consider streaming the response for better UX.
