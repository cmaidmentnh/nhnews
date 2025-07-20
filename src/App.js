import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import NewsletterSignup from './NewsletterSignup';
import PrivacyPolicy from './PrivacyPolicy';

const API_BASE = 'https://nh-news-api.solitary-shadow-b495.workers.dev/api';

function App() {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [displayedArticles, setDisplayedArticles] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Decode HTML entities
  const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  // Fetch articles from backend
  const fetchArticles = async () => {
    try {
      const response = await fetch(`${API_BASE}/news?limit=200`);
      const data = await response.json();
      setArticles(data.articles);
      setFilteredArticles(data.articles);
      setDisplayedArticles(data.articles.slice(0, 15)); // Show first 15
      setHasMore(data.articles.length > 15);
      setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        await fetchArticles();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
      setRefreshing(false);
    }
  };

  // Load more articles for infinite scroll
  const loadMoreArticles = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const currentLength = displayedArticles.length;
    const nextBatch = filteredArticles.slice(currentLength, currentLength + 15);
    
    setTimeout(() => {
      setDisplayedArticles(prev => [...prev, ...nextBatch]);
      setHasMore(currentLength + nextBatch.length < filteredArticles.length);
      setLoadingMore(false);
    }, 300); // Small delay to show loading state
  }, [displayedArticles.length, filteredArticles, loadingMore, hasMore]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Handle scroll events
  const handleScroll = useCallback(() => {
    // Show/hide back to top button
    setShowBackToTop(window.scrollY > 300);

    // Infinite scroll detection
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
      loadMoreArticles();
    }
  }, [displayedArticles.length, filteredArticles.length, loadingMore, hasMore]);

  // Filter articles
  useEffect(() => {
    let filtered = articles;

    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article =>
        article.categories && article.categories.includes(selectedCategory)
      );
    }

    if (selectedSource !== 'all') {
      filtered = filtered.filter(article =>
        article.source === selectedSource
      );
    }

    setFilteredArticles(filtered);
    setDisplayedArticles(filtered.slice(0, 15)); // Reset to first 15 when filters change
    setHasMore(filtered.length > 15);
  }, [articles, searchTerm, selectedCategory, selectedSource]);

  // Initial load
  useEffect(() => {
    fetchArticles();
    fetchStats();
    
    const interval = setInterval(fetchArticles, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll event listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Get all unique categories from articles
  const categories = ['all', ...new Set(
    articles.flatMap(article => article.categories || ['Local'])
  )];
  const sources = ['all', ...new Set(articles.map(article => article.source))];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading New Hampshire news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              🌐
            </div>
            <div>
              <h1 className="title">NH News Central</h1>
              <p className="subtitle">Live Free or Die State News</p>
            </div>
          </div>
          
          <div className="header-buttons">
            <button
              onClick={() => setShowStats(!showStats)}
              className="btn btn-secondary"
            >
              📊 Stats
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-primary"
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Stats Panel */}
      {showStats && stats && (
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                {stats.totalArticles}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Articles</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                {stats.totalSources}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>News Sources</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>
                {Object.keys(stats.categoryBreakdown || {}).length}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Categories</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c3aed' }}>
                {lastUpdated ? formatDate(lastUpdated) : 'Unknown'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Last Updated</div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        <div className="controls-content">
          {/* Search */}
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="filter-select"
          >
            {sources.slice(0, 20).map(source => (
              <option key={source} value={source}>
                {source === 'all' ? 'All Sources' : source}
              </option>
            ))}
          </select>

          {/* View Mode */}
          <div className="view-mode">
            {[
              { mode: 'cards', label: 'Cards' },
              { mode: 'list', label: 'List' },
              { mode: 'headlines', label: 'Headlines' }
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`view-btn ${viewMode === mode ? 'active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Newsletter Signup */}
      <div className="main">
        <NewsletterSignup />
      </div>

      {/* Main Content */}
      <main className="main">
        {displayedArticles.length === 0 && !loading ? (
          <div className="empty-state">
            No articles found matching your criteria
          </div>
        ) : (
          <div className={
            viewMode === 'cards' ? 'articles-grid' :
            viewMode === 'list' ? 'articles-list' :
            'articles-headlines'
          }>
            {displayedArticles.map((article, index) => (
              <article key={article.id} className={viewMode === 'headlines' ? 'headline-article' : 'article'}>
                {viewMode === 'headlines' ? (
                  <div className="headline-content">
                    <div className="headline-left">
                      <h3 className="headline-title">
                        {article.url && article.url !== '#' ? (
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            {decodeHtml(article.title)} ↗
                          </a>
                        ) : (
                          decodeHtml(article.title)
                        )}
                      </h3>
                      <div className="headline-meta">
                        <span>🏢 {article.source}</span>
                        <div className="category-tags">
                          {(article.categories || ['Local']).map(category => (
                            <span key={category} className={`category-tag category-${category}`}>
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="headline-time">
                      {formatDate(article.publishedAt)}
                    </span>
                  </div>
                ) : (
                  <div className="article-content">
                    <div className="article-header">
                      <div className="category-tags">
                        {(article.categories || ['Local']).map(category => (
                          <span key={category} className={`category-tag category-${category}`}>
                            🏷️ {category}
                          </span>
                        ))}
                      </div>
                      <span className="article-time">
                        🕒 {formatDate(article.publishedAt)}
                      </span>
                    </div>
                    
                    <h2 className="article-title">
                      {article.url && article.url !== '#' ? (
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          {decodeHtml(article.title)}
                          <span className="external-icon">↗</span>
                        </a>
                      ) : (
                        decodeHtml(article.title)
                      )}
                    </h2>
                    
                    {article.summary && (
                      <p className="article-summary">
                        {decodeHtml(article.summary)}
                      </p>
                    )}
                    
                    <div className="article-source">
                      🏢 {article.source}
                    </div>
                  </div>
                )}
              </article>
            ))}

            {/* Load More Indicator */}
            {loadingMore && (
              <div className="loading-more">
                <div className="spinner"></div>
                <span>Loading more articles...</span>
              </div>
            )}

            {/* End of Articles Message */}
            {!hasMore && displayedArticles.length > 0 && (
              <div className="end-message">
                You've reached the end! 🎉
              </div>
            )}
          </div>
        )}
      </main>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button onClick={scrollToTop} className="back-to-top">
          ↑
        </button>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>NH News Central - Aggregating news from {sources.length - 1} New Hampshire sources</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Unknown'}
          </p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            <button 
              onClick={() => setShowPrivacyPolicy(true)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#2563eb', 
                textDecoration: 'underline', 
                cursor: 'pointer',
                fontSize: '0.875rem',
                padding: 0
              }}
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />
      )}
    </div>
  );
}

export default App;