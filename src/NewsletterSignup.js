import React, { useState } from 'react';

const NewsletterSignup = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const API_BASE = 'https://nh-news-api.solitary-shadow-b495.workers.dev/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Successfully subscribed! Check your email for confirmation.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="newsletter-signup">
      <div className="newsletter-content">
        <div className="newsletter-header">
          <h3>📧 Daily NH News Digest</h3>
          <p>Get the top New Hampshire stories delivered to your inbox every evening at 7 PM.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="newsletter-form">
          <div className="form-group">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="newsletter-input"
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="newsletter-button"
            >
              {status === 'loading' ? '📤 Subscribing...' : '📬 Subscribe'}
            </button>
          </div>
          
          {message && (
            <div className={`newsletter-message ${status}`}>
              {message}
            </div>
          )}
        </form>
        
        <p className="newsletter-disclaimer">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </div>
  );
};

export default NewsletterSignup;