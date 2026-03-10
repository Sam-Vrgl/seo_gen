import { useState, useEffect, useRef } from 'react';
import './App.css';
import { api } from './api';
import ReactMarkdown from 'react-markdown';

function App() {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(5);
  const [includeArxiv, setIncludeArxiv] = useState(true);
  const [includePubmed, setIncludePubmed] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeFullPapers, setIncludeFullPapers] = useState(true);
  
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [faq, setFaq] = useState<string | null>(null);
  const [faqLoading, setFaqLoading] = useState(false);
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

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setArticles([]);
    setSelectedArticles(new Set());
    setSummary(null);
    setFaq(null);

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
            
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                <button 
                    className="analyze-btn" 
                    onClick={handleGenerateFaq} 
                    disabled={faqLoading}
                    style={{ backgroundColor: '#10b981', color: 'white' }}
                >
                    {faqLoading ? 'Generating FAQs...' : 'Generate FAQs'}
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
        {articles.length === 0 && !loading && !error && query && (
          <p>No results found.</p>
        )}
      </div>
    </div>
  );
}

export default App;
