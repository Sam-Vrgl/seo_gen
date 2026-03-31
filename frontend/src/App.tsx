import { useState, useEffect, useRef } from 'react';
import './App.css';
import { api } from './api';
import ReactMarkdown from 'react-markdown';

interface SearchClause {
  term: string;
  field: 'title' | 'abstract' | 'title_abstract' | 'all';
  operator: 'AND' | 'OR' | 'NOT';
}

const FIELD_LABELS: Record<SearchClause['field'], string> = {
  title: 'Title',
  abstract: 'Abstract',
  title_abstract: 'Title + Abstract',
  all: 'All Fields'
};

const defaultClause = (): SearchClause => ({ term: '', field: 'all', operator: 'AND' });

function App() {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(5);
  const [includeArxiv, setIncludeArxiv] = useState(true);
  const [includePubmed, setIncludePubmed] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeFullPapers, setIncludeFullPapers] = useState(true);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [clauses, setClauses] = useState<SearchClause[]>([defaultClause()]);
  
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [faq, setFaq] = useState<string | null>(null);
  const [faqLoading, setFaqLoading] = useState(false);
  const [illustration, setIllustration] = useState<string | null>(null);
  const [illustrationLoading, setIllustrationLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
        const timer = setTimeout(() => {
            setError(null);
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [error]);

  // ---- Clause management ----
  const updateClause = (index: number, updates: Partial<SearchClause>) => {
    setClauses(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };
  const addClause = () => setClauses(prev => [...prev, defaultClause()]);
  const removeClause = (index: number) => {
    setClauses(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));
  };

  // ---- Simple search ----
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setArticles([]);
    setSelectedArticles(new Set());
    setSummary(null);
    setFaq(null);
    setIllustration(null);

    try {
      const { data, error } = await api.search.get({
        query: {
            q: query,
            limit: limit.toString(),
            includeArxiv: includeArxiv.toString(),
            includePubmed: includePubmed.toString(),
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            includeFullPapers: includeFullPapers.toString()
        }
      });

      if (error) {
        setError(error.value ? String(error.value) : 'Unknown error');
      } else if (data) {
        setArticles(data);
        setSelectedArticles(new Set(data.map((a: any) => a.url)));
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Advanced search ----
  const handleAdvancedSearch = async () => {
    const validClauses = clauses.filter(c => c.term.trim() !== '');
    if (validClauses.length === 0) {
      setError('Please enter at least one search term.');
      return;
    }

    setLoading(true);
    setError(null);
    setArticles([]);
    setSelectedArticles(new Set());
    setSummary(null);
    setFaq(null);
    setIllustration(null);

    try {
      const { data, error } = await api['advanced-search'].post({
        clauses: validClauses,
        limit,
        includeArxiv,
        includePubmed,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeFullPapers
      });

      if (error) {
        setError(error.value ? String(error.value) : 'Unknown error');
      } else if (data) {
        setArticles(data as any[]);
        setSelectedArticles(new Set((data as any[]).map((a: any) => a.url)));
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (url: string) => {
    const newSelection = new Set(selectedArticles);
    if (newSelection.has(url)) {
        newSelection.delete(url);
    } else {
        newSelection.add(url);
    }
    setSelectedArticles(newSelection);
  };

  const toggleAll = (selectAll: boolean) => {
    if (selectAll) {
        setSelectedArticles(new Set(articles.map(a => a.url)));
    } else {
        setSelectedArticles(new Set());
    }
  };

  const toggleFullText = (url: string) => {
    const newExpanded = new Set(expandedArticles);
    if (newExpanded.has(url)) {
        newExpanded.delete(url);
    } else {
        newExpanded.add(url);
    }
    setExpandedArticles(newExpanded);
  };

  const handleAnalyze = async () => {
    if (articles.length === 0) return;

    const articlesToAnalyze = articles.filter(a => selectedArticles.has(a.url));

    if (articlesToAnalyze.length === 0) {
        setError('Please select at least one article to analyze.');
        return;
    }

    setSummaryLoading(true);
    setFaq(null);
    setIllustration(null);
    try {
        const { data, error } = await api.analyze.post({
            articles: articlesToAnalyze
        });
        
        if (error) {
             setError(error.value ? String(error.value) : 'Failed to analyze');
        } else {
             setSummary(data);
        }
    } catch (err) {
        setError('Failed to trigger analysis');
        console.error(err);
    } finally {
        setSummaryLoading(false);
    }
  };

  const handleGenerateFaq = async () => {
    if (!summary) return;

    setFaqLoading(true);
    try {
        const { data, error } = await api['generate-faq'].post({
            article: summary
        });
        
        if (error) {
             setError(error.value ? String(error.value) : 'Failed to generate FAQ');
        } else {
             setFaq(data);
        }
    } catch (err) {
        setError('Failed to trigger FAQ generation');
        console.error(err);
    } finally {
        setFaqLoading(false);
    }
  };

  const handleGenerateIllustration = async () => {
    if (!summary) return;

    setIllustrationLoading(true);
    setIllustration(null);
    try {
        const { data, error } = await api['generate-illustration'].post({
            article: summary
        });
        
        if (error) {
             setError(error.value ? String(error.value) : 'Failed to generate illustration');
        } else if (data) {
             setIllustration(data as string);
        }
    } catch (err) {
        setError('Failed to trigger illustration generation');
        console.error(err);
    } finally {
        setIllustrationLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        return;
    }

    setUploading(true);
    setError(null);

    try {
        const { data, error } = await api['upload-pdf'].post({
            file: file
        });

        if (error) {
            setError(error.value ? String(error.value) : 'Failed to upload PDF');
        } else if (data) {
            setArticles(prev => [data, ...prev]);
            setSelectedArticles(prev => new Set(prev).add(data.url));
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    } catch (err) {
        console.error("Upload error:", err);
        setError('Failed to upload file');
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="container">
      <h1>Research Paper Search</h1>
      <div className="search-panel">

        {/* Toggle between simple and advanced */}
        <div className="search-mode-toggle">
          <button
            className={`mode-btn ${!advancedMode ? 'active' : ''}`}
            onClick={() => setAdvancedMode(false)}
          >Simple Search</button>
          <button
            className={`mode-btn ${advancedMode ? 'active' : ''}`}
            onClick={() => setAdvancedMode(true)}
          >Advanced Search</button>
        </div>

        {/* ---- Simple search bar ---- */}
        {!advancedMode && (
          <div className="search-box">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter topic (e.g., machine learning)"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        )}

        {/* ---- Advanced search builder ---- */}
        {advancedMode && (
          <div className="advanced-search">
            <div className="advanced-clauses">
              {clauses.map((clause, i) => (
                <div key={i} className="advanced-row">
                  {/* Boolean operator (hidden for first row) */}
                  {i === 0 ? (
                    <div className="operator-spacer"></div>
                  ) : (
                    <select
                      className="operator-select"
                      value={clause.operator}
                      onChange={(e) => updateClause(i, { operator: e.target.value as SearchClause['operator'] })}
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                      <option value="NOT">NOT</option>
                    </select>
                  )}

                  {/* Search term */}
                  <input
                    type="text"
                    className="clause-term"
                    value={clause.term}
                    onChange={(e) => updateClause(i, { term: e.target.value })}
                    placeholder='Keyword or "exact phrase"'
                    onKeyDown={(e) => e.key === 'Enter' && handleAdvancedSearch()}
                  />

                  {/* Field selector */}
                  <select
                    className="field-select"
                    value={clause.field}
                    onChange={(e) => updateClause(i, { field: e.target.value as SearchClause['field'] })}
                  >
                    {Object.entries(FIELD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>

                  {/* Remove button */}
                  <button
                    className="clause-btn remove-btn"
                    onClick={() => removeClause(i)}
                    disabled={clauses.length <= 1}
                    title="Remove clause"
                  >−</button>
                </div>
              ))}
            </div>

            <div className="advanced-actions">
              <button
                className="clause-btn add-btn"
                onClick={addClause}
                disabled={clauses.length >= 8}
                title="Add clause"
              >+ Add condition</button>
              <button onClick={handleAdvancedSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        )}
        
        <div className="filters">
            <div className="filter-group">
                <label>Limit:</label>
                <input 
                    type="number" 
                    min="1" 
                    max="50" 
                    value={limit} 
                    onChange={(e) => setLimit(parseInt(e.target.value) || 5)} 
                />
            </div>
            
            <div className="filter-group">
                <label>Sources:</label>
                <label className="checkbox-label">
                    <input 
                        type="checkbox" 
                        checked={includeArxiv} 
                        onChange={(e) => setIncludeArxiv(e.target.checked)} 
                    /> ArXiv
                </label>
                <label className="checkbox-label">
                    <input 
                        type="checkbox" 
                        checked={includePubmed} 
                        onChange={(e) => setIncludePubmed(e.target.checked)} 
                    /> PubMed Central (PMC)
                </label>
                <label className="checkbox-label" title="Fetching full text (slower)">
                    <input 
                        type="checkbox" 
                        checked={includeFullPapers} 
                        onChange={(e) => setIncludeFullPapers(e.target.checked)}
                        disabled={!includeArxiv && !includePubmed}
                    /> Include Full Text
                </label>
            </div>

            <div className="filter-group">
                <label>Date Range:</label>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    placeholder="Start Date"
                />
                <span>to</span>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    placeholder="End Date"
                />
            </div>
        </div>

        <div className="upload-container" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center' }}>
            <div className="upload-section">
                <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }} 
                    ref={fileInputRef}
                    id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="secondary-btn upload-btn">
                    {uploading ? 'Uploading...' : 'Upload PDF'}
                </label>
            </div>
        </div>
        
        {articles.length > 0 && (
            <div className="actions">
                <div className="selection-controls">
                    <button className="secondary-btn" onClick={() => toggleAll(true)}>Select All</button>
                    <button className="secondary-btn" onClick={() => toggleAll(false)}>Deselect All</button>
                    <span className="selection-count">{selectedArticles.size} selected</span>
                </div>
                


                <button 
                    className="analyze-btn" 
                    onClick={handleAnalyze} 
                    disabled={summaryLoading || selectedArticles.size === 0}
                    style={{ marginTop: '1rem', backgroundColor: '#646cff', color: 'white' }}
                >
                    {summaryLoading ? 'Analyzing with Gemini...' : 'Summarize Selected with Gemini'}
                </button>
            </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {summaryLoading && (
        <div className="summary-section loading-state">
            <div className="spinner"></div>
            <p>Analyzing search results with Gemini...</p>
        </div>
      )}

      {summary && !summaryLoading && (
        <div className="summary-section">
            <h2>Gemini Analysis</h2>
            <div className="markdown-content">
                <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button 
                    className="analyze-btn" 
                    onClick={handleGenerateFaq} 
                    disabled={faqLoading}
                    style={{ backgroundColor: '#10b981', color: 'white' }}
                >
                    {faqLoading ? 'Generating FAQs...' : 'Generate FAQs'}
                </button>
                <button 
                    className="analyze-btn" 
                    onClick={handleGenerateIllustration} 
                    disabled={illustrationLoading}
                    style={{ backgroundColor: '#f59e0b', color: 'white' }}
                >
                    {illustrationLoading ? 'Generating Illustration...' : 'Generate Illustration'}
                </button>
            </div>
        </div>
      )}

      {faqLoading && (
        <div className="summary-section loading-state" style={{ marginTop: '1rem' }}>
            <div className="spinner"></div>
            <p>Generating FAQs with Gemini...</p>
        </div>
      )}

      {faq && !faqLoading && (
        <div className="summary-section" style={{ marginTop: '1rem', borderTop: '2px solid #eee' }}>
            <h2>Frequently Asked Questions</h2>
            <div className="markdown-content">
                <ReactMarkdown>{faq}</ReactMarkdown>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                <button 
                    className="analyze-btn" 
                    disabled
                    style={{ backgroundColor: '#9ca3af', color: 'white', cursor: 'not-allowed' }}
                >
                    Generate Elementor FAQ
                </button>
            </div>
        </div>
      )}

      {illustrationLoading && (
        <div className="summary-section loading-state" style={{ marginTop: '1rem' }}>
            <div className="spinner"></div>
            <p>Generating Scientific Illustration...</p>
        </div>
      )}

      {illustration && !illustrationLoading && (
        <div className="summary-section" style={{ marginTop: '1rem', borderTop: '2px solid #eee' }}>
            <h2>Scientific Illustration</h2>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
               <img src={`data:image/jpeg;base64,${illustration}`} alt="Generated Scientific Illustration" style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
            </div>
        </div>
      )}

      <div className="results">
        {articles.map((article, index) => (
          <div key={index} className={`article-card ${selectedArticles.has(article.url) ? 'selected' : ''}`}>
            <div className="article-header">
                <input 
                    type="checkbox" 
                    className="article-checkbox"
                    checked={selectedArticles.has(article.url)}
                    onChange={() => toggleSelection(article.url)}
                />
                <h3>
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                    {article.title}
                </a>
                </h3>
            </div>
            <p className="authors">{article.authors.join(', ')}</p>
            <p className="source-badge">
                {article.source}
            </p>
            <span className="date">{new Date(article.published_date).toLocaleDateString()}</span>
            {article.fullText ? (
                <div className="full-text-container">
                    <div className="full-text-header">
                        <span className="badge">Full Text Available</span>
                        <button 
                            className="secondary-btn toggle-text-btn"
                            onClick={() => toggleFullText(article.url)}
                        >
                            {expandedArticles.has(article.url) ? 'Hide Full Text' : 'Show Full Text'}
                        </button>
                    </div>
                    {expandedArticles.has(article.url) ? (
                        <div className="full-text-content">
                            {article.fullText}
                        </div>
                    ) : (
                        <p className="abstract">{article.fullText.substring(0, 300)}...</p>
                    )}
                </div>
            ) : (
                <p className="abstract">{article.abstract}</p>
            )}
          </div>
        ))}
        {articles.length === 0 && !loading && !error && (query || clauses.some(c => c.term.trim())) && (
          <p>No results found.</p>
        )}
      </div>
    </div>
  );
}

export default App;
