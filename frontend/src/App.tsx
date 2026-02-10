import { useState } from 'react';
import './App.css';
import { api } from './api';

function App() {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(5);
  const [includeArxiv, setIncludeArxiv] = useState(true);
  const [includePubmed, setIncludePubmed] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeAbstracts, setIncludeAbstracts] = useState(false);
  
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setArticles([]);

    try {
      const { data, error } = await api.search.get({
        query: {
            q: query,
            limit: limit.toString(),
            includeArxiv: includeArxiv.toString(),
            includePubmed: includePubmed.toString(),
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            includeAbstracts: includeAbstracts.toString()
        }
      });

      if (error) {
        setError(error.value ? String(error.value) : 'Unknown error');
      } else if (data) {
        setArticles(data);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
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
                    /> PubMed
                </label>
                <label className="checkbox-label" title="Fetching abstracts is slower">
                    <input 
                        type="checkbox" 
                        checked={includeAbstracts} 
                        onChange={(e) => setIncludeAbstracts(e.target.checked)} 
                        disabled={!includePubmed}
                    /> Fetch Abstracts
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
      </div>

      {error && <div className="error">{error}</div>}

      <div className="results">
        {articles.map((article, index) => (
          <div key={index} className="article-card">
            <h3>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                {article.title}
              </a>
            </h3>
            <p className="authors">{article.authors.join(', ')}</p>
            <p className="source-badge">
                {article.source}
            </p>
            <span className="date">{new Date(article.published_date).toLocaleDateString()}</span>
            <p className="abstract">{article.abstract}</p>
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
