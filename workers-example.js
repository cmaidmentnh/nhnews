// NH News Backend - Cloudflare Workers Version WITH NEWSLETTER
// Deploy with: wrangler deploy

// ADD THIS IMPORT AT THE TOP (after any existing imports)
import { Resend } from 'resend';

// News sources configuration - ONLY VERIFIED WORKING RSS FEEDS
const NEWS_SOURCES = {
  rss: [
    // Major TV/Radio
    { name: 'WMUR', url: 'https://www.wmur.com/topstories-rss', category: 'Local News' },
    { name: 'New Hampshire Public Radio', url: 'https://www.nhpr.org/rss.xml', category: 'State News' },
    
    // Major Statewide Newspapers 
    { name: 'Union Leader', url: 'https://www.unionleader.com/search/?q=&t=article&f=rss&bl=703807', category: 'Local News' },
    
    // Regional Newspapers
    { name: 'Eagle Times', url: 'https://eagletimes.com/feed/', category: 'Regional' },
    { name: 'Laconia Daily Sun', url: 'https://www.laconiadailysun.com/search/?f=rss', category: 'Lakes Region' },
    { name: 'Conway Daily Sun', url: 'https://www.conwaydailysun.com/search/?f=rss', category: 'North Country' },
    { name: 'Keene Sentinel', url: 'https://www.keenesentinel.com/search/?f=rss', category: 'Southwest NH' },
    { name: 'Derry News', url: 'https://www.derrynews.com/search/?f=rss', category: 'Regional' },
    { name: 'Seacoast Current', url: 'https://seacoastcurrent.com/feed/', category: 'Seacoast' },
    
    // Digital-First & Investigative News
    { name: 'New Hampshire Bulletin', url: 'https://newhampshirebulletin.com/feed', category: 'State News' },
    { name: 'Manchester Ink Link', url: 'https://manchesterinklink.com/feed/', category: 'Local News' },
    { name: 'Nashua Ink Link', url: 'https://nashuainklink.com/feed/', category: 'Local News' },
    { name: 'InDepthNH', url: 'https://indepthnh.org/feed/', category: 'Investigative' },
    { name: 'NH Journal', url: 'https://nhjournal.com/feed/', category: 'Politics' },
    { name: 'Granite Eagle Press', url: 'https://www.graniteeaglepress.com/news/blog-feed.xml', category: 'Politics' },
    
    // Business Coverage
    { name: 'NH Business Review', url: 'https://nhbr.com/feed', category: 'Business' },
    
    // Alternative & Entertainment
    { name: 'Hippo Press', url: 'https://hippopress.com/feed/', category: 'Entertainment' },
    { name: 'NH Gazette', url: 'https://nhgazette.com/feed', category: 'Alternative' },
    
    // Additional Regional Coverage
    { name: 'Monadnock Ledger-Transcript', url: 'https://rss.app/feeds/ZmPxJDxqGRDfGXjD.xml', category: 'Southwest NH' },
    { name: 'Berlin Sun', url: 'https://www.conwaydailysun.com/berlin_sun/feed/', category: 'North Country' },
    { name: 'Exeter News-Letter', url: 'https://www.seacoastonline.com/exeter/search/?f=rss', category: 'Seacoast' },
    { name: 'Hampton Union', url: 'https://www.seacoastonline.com/hampton/search/?f=rss', category: 'Seacoast' },
    { name: 'Valley News', url: 'https://rss.app/feeds/8rzPJvzqGzDGMq9m.xml', category: 'Upper Valley' },
    { name: 'Nutfield News', url: 'https://nutfieldnews.net/feed/', category: 'Regional' },
    { name: 'NH Fiscal Policy Institute', url: 'https://nhfpi.org/feed', category: 'Politics' },
    { name: 'Londonderry Times', url: 'https://nutpub.net/londonderry_times/feed/', category: 'Regional' },
    { name: 'Tri-Town Times', url: 'https://nutpub.net/tri_town_times/feed/', category: 'Regional' },
  ]
};

// Keywords to identify NH-relevant content
const NH_KEYWORDS = [
  'new hampshire', 'nh', 'manchester', 'nashua', 'concord', 'derry', 'rochester',
  'salem', 'merrimack', 'hudson', 'londonderry', 'keene', 'portsmouth', 
  'laconia', 'claremont', 'lebanon', 'berlin', 'somersworth', 'dover',
  'live free or die', 'granite state', 'seacoast', 'white mountains',
  'mount washington', 'unh', 'university of new hampshire', 'exeter', 'hampton',
  'north conway', 'conway', 'peterborough', 'milford', 'jaffrey'
];

// NH Journalists and news accounts to monitor for retweeting
const NH_JOURNALISTS = [
  'Globe_NH', 'AMitropsWMUR', 'MarissaWMUR', 'NHBulletinNews', 'DanaWormaldNH',
  'charmatherly', 'GraniteMemo', 'MonicaWMUR', 'Kjwalsh_news', 'schadgibson',
  'amanda_gokee', 'cityhallpaul', 'alisonkmain', 'emmab929', 'InkLinkNews',
  'reporterporter', 'nancywestnews', 'AdamSextonWMUR', 'TimCal20', 'toddbookman',
  'samanthajgross', 'CMonitor_JVF', 'lisakashinsky', 'edewittNH', 'joshrogersNHPR',
  'JamesPindell', 'NewHampJournal', 'KlandriganUL', 'Jon_Phelps13', 'andrewsylvia',
  'JackHeathRadio', 'steinhauserNH1', 'caseymcdermott', 'annmarietimmins',
  'deucecrew', 'danielbarrick', 'WCAX_Adam', 'GregMooreNH', 'DrewHampshire'
];

// ADD THESE NEWSLETTER FUNCTIONS HERE

// Newsletter utility functions
function generateToken() {
  return crypto.randomUUID();
}

function getResend(env) {
  return new Resend(env.RESEND_API_KEY);
}

// Newsletter subscription handler
async function handleNewsletterSubscribe(request, env) {
  try {
    const { email } = await request.json();
    
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const confirmationToken = generateToken();
    const unsubscribeToken = generateToken();

    // Check if email already exists
    const existing = await env.DB.prepare(`
      SELECT email FROM subscribers WHERE email = ?
    `).bind(email).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Email already subscribed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Insert new subscriber
    await env.DB.prepare(`
      INSERT INTO subscribers (email, confirmation_token, unsubscribe_token)
      VALUES (?, ?, ?)
    `).bind(email, confirmationToken, unsubscribeToken).run();

    // Send confirmation email
    const resend = getResend(env);
    await resend.emails.send({
      from: 'NH News Central <newsletter@nhnews.io>',
      to: email,
      subject: 'Confirm your NH News subscription',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1>🌐 Welcome to NH News Central!</h1>
            <p style="font-size: 18px;">Get the top New Hampshire stories delivered daily at 7 PM</p>
          </div>
          
          <div style="padding: 30px 0;">
            <p>Thanks for subscribing to our daily newsletter! Please confirm your subscription by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://nhnews.io/api/newsletter/confirm/${confirmationToken}" 
                 style="background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                ✅ Confirm Subscription
              </a>
            </div>
            
            <p><small>If you didn't request this, you can safely ignore this email.</small></p>
          </div>
        </body>
        </html>
      `
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Subscription request sent! Please check your email to confirm.' 
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// Confirm subscription handler
async function handleNewsletterConfirm(request, env) {
  const url = new URL(request.url);
  const token = url.pathname.split('/').pop();

  try {
    const subscriber = await env.DB.prepare(`
      SELECT id, email FROM subscribers WHERE confirmation_token = ? AND confirmed = FALSE
    `).bind(token).first();

    if (!subscriber) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Invalid or Expired Link</h1>
          <p>This confirmation link is invalid or has already been used.</p>
          <a href="https://nhnews.io" style="color: #2563eb;">Return to NH News Central</a>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Confirm subscription
    await env.DB.prepare(`
      UPDATE subscribers SET confirmed = TRUE, confirmation_token = NULL WHERE id = ?
    `).bind(subscriber.id).run();

    return new Response(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 10px; margin: 20px 0;">
          <h1>🎉 Subscription Confirmed!</h1>
          <p>Welcome to NH News Central daily newsletter!</p>
        </div>
        <p>You'll receive your first newsletter today at 7 PM EST.</p>
        <a href="https://nhnews.io" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
          📰 Read Latest News
        </a>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Newsletter confirmation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Send daily newsletter
async function sendDailyNewsletter(env) {
  try {
    console.log('Starting daily newsletter send...');
    
    // Get confirmed subscribers
    const subscribers = await env.DB.prepare(`
      SELECT email, unsubscribe_token FROM subscribers WHERE confirmed = TRUE
    `).all();

    if (subscribers.results.length === 0) {
      console.log('No confirmed subscribers found');
      return;
    }

    // Get today's top articles
    const articles = await env.DB.prepare(`
      SELECT title, summary, url, source, published_at 
      FROM articles 
      WHERE DATE(published_at, 'unixepoch') >= DATE('now', '-1 day')
      ORDER BY published_at DESC 
      LIMIT 15
    `).all();

    if (articles.results.length === 0) {
      console.log('No articles found for newsletter');
      return;
    }

    const resend = getResend(env);
    const emailHTML = generateNewsletterHTML(articles.results);

    // Send to all subscribers
    let successCount = 0;
    for (const subscriber of subscribers.results) {
      try {
        const personalizedHTML = emailHTML.replace('{{UNSUBSCRIBE_TOKEN}}', subscriber.unsubscribe_token);
        
        await resend.emails.send({
          from: 'NH News Central <newsletter@nhnews.io>',
          to: subscriber.email,
          subject: `NH News Daily - ${new Date().toLocaleDateString()}`,
          html: personalizedHTML
        });
        
        successCount++;
      } catch (emailError) {
        console.error(`Failed to send to ${subscriber.email}:`, emailError);
      }
    }

    console.log(`Newsletter sent to ${successCount}/${subscribers.results.length} subscribers`);

  } catch (error) {
    console.error('Daily newsletter error:', error);
  }
}

// Generate newsletter HTML
function generateNewsletterHTML(articles) {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const articleHTML = articles.map(article => `
    <div style="border-bottom: 1px solid #e5e7eb; padding: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937;">
        <a href="${article.url}" style="color: #1f2937; text-decoration: none;">${article.title}</a>
      </h3>
      <p style="color: #6b7280; margin: 10px 0; line-height: 1.5;">${article.summary}</p>
      <div style="font-size: 14px; color: #9ca3af;">
        <span>🏢 ${article.source}</span> • 
        <span>🕒 ${new Date(article.published_at * 1000).toLocaleTimeString()}</span>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center;">
        <h1>🌐 NH News Central</h1>
        <h2 style="margin: 10px 0 0 0;">${today}</h2>
        <p>Your daily digest of New Hampshire news</p>
      </div>
      
      <div style="background: white; padding: 30px;">
        <h2 style="color: #1f2937; margin-top: 0;">📰 Today's Top Stories</h2>
        ${articleHTML}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280;">
            <a href="https://nhnews.io" style="color: #2563eb;">Visit NH News Central</a> • 
            <a href="https://nhnews.io/api/newsletter/unsubscribe/{{UNSUBSCRIBE_TOKEN}}" style="color: #6b7280;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// END OF NEWSLETTER FUNCTIONS

// Simple RSS parser for Cloudflare Workers (no DOM parser available)
class SimpleRSSParser {
  extractText(xml, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
  }

  extractLink(xml) {
    // Try different link formats
    let link = this.extractText(xml, 'link');
    if (!link) {
      const linkMatch = xml.match(/<link[^>]*href=['"]([^'"]*)['"]/i);
      if (linkMatch) link = linkMatch[1];
    }
    return link;
  }

  parseItem(itemXml) {
    return {
      title: this.extractText(itemXml, 'title'),
      description: this.extractText(itemXml, 'description') || this.extractText(itemXml, 'content:encoded') || this.extractText(itemXml, 'summary'),
      link: this.extractLink(itemXml),
      pubDate: this.extractText(itemXml, 'pubDate') || this.extractText(itemXml, 'published') || this.extractText(itemXml, 'updated'),
      content: this.extractText(itemXml, 'content:encoded') || this.extractText(itemXml, 'description')
    };
  }

  async parseURL(url) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NHNewsBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    
    // Basic XML cleaning
    const cleanedXML = xmlText
      .replace(/&(?![a-zA-Z0-9#]{1,6};)/g, '&amp;')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Extract items using regex (since no DOM parser available)
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    
    const items = [];
    let match;
    
    // Try RSS format first
    while ((match = itemRegex.exec(cleanedXML)) !== null) {
      items.push(this.parseItem(match[1]));
    }
    
    // Try Atom format if no RSS items found
    if (items.length === 0) {
      while ((match = entryRegex.exec(cleanedXML)) !== null) {
        items.push(this.parseItem(match[1]));
      }
    }
    
    return { items };
  }
}

// Utility functions
function isNHRelevant(title, content, source) {
  const text = `${title} ${content}`.toLowerCase();
  
  // Always check for NH keywords, even for local sources
  const hasNHKeywords = NH_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
  
  // Sources that are generally NH-focused but we still want to keyword check
  const generallyNHSources = [
    'WMUR', 'New Hampshire Public Radio', 'Union Leader', 'New Hampshire Bulletin', 
    'Manchester Ink Link', 'Nashua Ink Link', 'InDepthNH', 'NH Journal', 
    'NH Business Review', 'NH Gazette', 'NH Fiscal Policy Institute',
    'Carriage Towne News', 'Nutfield News', 'Granite Eagle Press'
  ];
  
  // Regional sources that should always be relevant (truly local)
  const trulyLocalSources = [
    'Eagle Times', 'Laconia Daily Sun', 'Conway Daily Sun', 'Keene Sentinel', 
    'Derry News', 'Seacoast Current', 'Londonderry Times', 'Tri-Town Times', 
    'Monadnock Ledger-Transcript', 'Berlin Sun', 'Exeter News-Letter', 
    'Hampton Union', 'Valley News'
  ];
  
  // For truly local sources, assume relevance
  if (trulyLocalSources.includes(source)) {
    return true;
  }
  
  // For generally NH sources, require NH keywords
  if (generallyNHSources.includes(source)) {
    return hasNHKeywords;
  }
  
  // For all other sources, definitely require NH keywords
  return hasNHKeywords;
}

function extractSummary(content, maxLength = 200) {
  if (!content) return '';
  
  const textOnly = content.replace(/<[^>]*>/g, '');
  
  if (textOnly.length <= maxLength) return textOnly;
  
  const truncated = textOnly.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

// Convert title to AP Style capitalization
function convertToAPStyle(title) {
  if (!title) return '';
  
  // Words that should be lowercase in AP style (unless first/last word)
  const lowercaseWords = [
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 
    'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'with', 'from', 'into', 
    'onto', 'upon', 'over', 'under', 'above', 'below', 'across', 'through',
    'during', 'before', 'after', 'toward', 'near'
  ];
  
  // Words that should always be capitalized
  const alwaysCapitalize = [
    'NH', 'USA', 'US', 'UK', 'EU', 'UN', 'NATO', 'FBI', 'CIA', 'GOP', 'CEO',
    'CFO', 'CTO', 'VP', 'MD', 'PhD', 'Jr', 'Sr', 'Inc', 'LLC', 'Corp',
    'WMUR', 'NHPR', 'UNH', 'PSU', 'MIT', 'UCLA', 'USC', 'NYC', 'LA', 'DC'
  ];
  
  const words = title.split(/\s+/);
  
  return words.map((word, index) => {
    const cleanWord = word.replace(/[^\w']/g, '').toLowerCase();
    const punctuation = word.replace(/[\w']/g, '');
    
    // Always capitalize if it's an acronym or special word
    if (alwaysCapitalize.includes(cleanWord.toUpperCase())) {
      return cleanWord.toUpperCase() + punctuation;
    }
    
    // Always capitalize first and last words
    if (index === 0 || index === words.length - 1) {
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1) + punctuation;
    }
    
    // Lowercase articles, prepositions, conjunctions (unless first/last)
    if (lowercaseWords.includes(cleanWord)) {
      return cleanWord + punctuation;
    }
    
    // Capitalize everything else
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1) + punctuation;
  }).join(' ');
}

function categorizeNews(title, content, source) {
  const text = `${title} ${content}`.toLowerCase();
  const categories = [];
  
  // Weather - very specific
  if (text.includes('weather') || text.includes('storm') || text.includes('snow') || 
      text.includes('rain') || text.includes('temperature') || text.includes('forecast') ||
      text.includes('blizzard') || text.includes('hurricane') || text.includes('tornado') ||
      text.includes('flood') || text.includes('drought') || text.includes('heat wave')) {
    categories.push('Weather');
  }
  
  // Sports - specific keywords only
  if (text.includes('baseball') || text.includes('football') || text.includes('basketball') ||
      text.includes('hockey') || text.includes('soccer') || text.includes('golf') || 
      text.includes('tennis') || text.includes('championship') || text.includes('playoff') ||
      text.includes('season') || text.includes('coach') || text.includes('player') ||
      text.includes('game') || text.includes('score') || text.includes('win') || 
      text.includes('loss') || text.includes('nascar') || text.includes('racing') ||
      text.includes('babe ruth') || text.includes('little league') || text.includes('swamp bats')) {
    categories.push('Sports');
  }
  
  // Crime - specific law enforcement terms
  if (text.includes('arrested') || text.includes('charged') || text.includes('convicted') || 
      text.includes('sentenced') || text.includes('police') || text.includes('investigation') ||
      text.includes('suspect') || text.includes('victim') || text.includes('murder') || 
      text.includes('assault') || text.includes('theft') || text.includes('robbery') ||
      text.includes('drugs') || text.includes('dui') || text.includes('domestic violence') ||
      text.includes('fraud') || text.includes('scam') || text.includes('felony') ||
      text.includes('court') && (text.includes('guilty') || text.includes('trial') || text.includes('sentence'))) {
    categories.push('Crime');
  }
  
  // Education - school and learning related (more specific)
  if ((text.includes('school') && !text.includes('high school musical')) || 
      text.includes('education') || text.includes('student') || text.includes('teacher') || 
      text.includes('principal') || text.includes('superintendent') || text.includes('unh') ||
      text.includes('university') || text.includes('college') || text.includes('classroom') ||
      text.includes('curriculum') || text.includes('graduation') || text.includes('tuition') ||
      text.includes('scholarship') || text.includes('degree') || text.includes('vouchers')) {
    categories.push('Education');
  }
  
  // Business - economic and commercial (more specific)
  if (text.includes('business') || text.includes('economy') || text.includes('economic') ||
      text.includes('jobs') || text.includes('employment') || text.includes('unemployment') ||
      text.includes('company') || text.includes('corporation') || text.includes('startup') ||
      text.includes('investment') || text.includes('revenue') || text.includes('profit') ||
      text.includes('market') || text.includes('industry') || text.includes('manufacturing') ||
      text.includes('retail') || text.includes('restaurant') && !text.includes('review') ||
      text.includes('tourism') || text.includes('real estate') || text.includes('housing prices')) {
    categories.push('Business');
  }
  
  // Politics - MUCH more specific, avoid entertainment false positives
  if ((text.includes('governor') || text.includes('ayotte') || text.includes('sununu') ||
      text.includes('legislature') || text.includes('statehouse') || text.includes('senate') && !text.includes('young and restless') ||
      text.includes('house') && (text.includes('republican') || text.includes('democrat') || text.includes('representative')) ||
      text.includes('bill') && (text.includes('veto') || text.includes('passed') || text.includes('signed')) ||
      text.includes('vote') || text.includes('voting') || text.includes('ballot') ||
      text.includes('election') || text.includes('primary') || text.includes('campaign') ||
      text.includes('candidate') || text.includes('republican') || text.includes('democrat') ||
      text.includes('congress') || text.includes('federal') && !text.includes('federal express') ||
      text.includes('town council') || text.includes('city council') || text.includes('selectmen') ||
      text.includes('mayor') || text.includes('alderman') || text.includes('commissioner') ||
      text.includes('budget') && !text.includes('movie budget') || text.includes('tax') && !text.includes('syntax') ||
      text.includes('funding') && !text.includes('crowdfunding') || text.includes('spending') ||
      text.includes('ordinance') || text.includes('zoning') || text.includes('planning commission') ||
      text.includes('town meeting') || text.includes('board meeting') || text.includes('hearing') && text.includes('public') ||
      text.includes('veto') || text.includes('legislation') || text.includes('constitutional') ||
      text.includes('lawsuit') && (text.includes('government') || text.includes('state') || text.includes('federal')) ||
      text.includes('attorney general') || text.includes('secretary of state') ||
      text.includes('executive council') || text.includes('trump') || text.includes('biden') ||
      text.includes('maga') || text.includes('administration') && !text.includes('drug administration') ||
      text.includes('medicaid') || text.includes('medicare') || text.includes('immigration') ||
      text.includes('abortion') || text.includes('transgender') || text.includes('bathroom bill') ||
      text.includes('second amendment') || text.includes('first amendment') ||
      text.includes('civil rights') || text.includes('birthright citizenship')) &&
      // Exclude entertainment false positives
      !text.includes('netflix') && !text.includes('movie') && !text.includes('tv show') &&
      !text.includes('actor') && !text.includes('actress') && !text.includes('film') &&
      !text.includes('series') && !text.includes('season finale') && !text.includes('episode')) {
    categories.push('Politics');
  }
  
  // If no specific categories, default to Local
  if (categories.length === 0) {
    categories.push('Local');
  }
  
  return categories;
}

// Database functions
async function initDatabase(env) {
  // Create articles table
  await env.DB.exec(`CREATE TABLE IF NOT EXISTS articles (id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT, source TEXT NOT NULL, categories TEXT NOT NULL, published_at INTEGER NOT NULL, url TEXT, created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch()))`);

  // Create subscribers table
  await env.DB.exec(`CREATE TABLE IF NOT EXISTS subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, confirmed BOOLEAN DEFAULT FALSE, confirmation_token TEXT UNIQUE, unsubscribe_token TEXT UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  // Create indexes one by one
  try {
    await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_published_at ON articles(published_at DESC)`);
    await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_source ON articles(source)`);
    await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_email ON subscribers(email)`);
    await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_confirmation_token ON subscribers(confirmation_token)`);
    await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_unsubscribe_token ON subscribers(unsubscribe_token)`);
    await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_confirmed ON subscribers(confirmed)`);
  } catch (error) {
    console.log('Index creation error (likely already exist):', error.message);
  }
}

// FIXED SAVE ARTICLE FUNCTION - NO MORE DUPLICATES, MULTI-CATEGORY, AP STYLE
async function saveArticle(env, article) {
  // Create a more stable ID based on title and source to prevent duplicates
  const titleKey = article.title.toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
    .substring(0, 50); // Limit length
  
  const sourceKey = article.source.replace(/[^a-zA-Z0-9]/g, '');
  const stableId = `${sourceKey}-${titleKey}`;
  
  // Check if article already exists
  const existing = await env.DB.prepare(`
    SELECT id FROM articles WHERE id = ?
  `).bind(stableId).first();
  
  if (existing) {
    // Article already exists, skip it
    return false;
  }
  
  // Convert title to AP Style
  const apStyleTitle = convertToAPStyle(article.title);
  
  // Convert categories array to JSON string for storage
  const categoriesJson = JSON.stringify(article.categories);
  
  // Insert new article
  const stmt = env.DB.prepare(`
    INSERT INTO articles 
    (id, title, summary, source, categories, published_at, url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
  `);

  await stmt.bind(
    stableId,
    apStyleTitle, // Use AP Style title
    article.summary,
    article.source,
    categoriesJson,
    Math.floor(article.publishedAt.getTime() / 1000),
    article.url
  ).run();
  
  return true; // Successfully added new article
}

async function getArticles(env, options = {}) {
  const { limit = 100, category, source, offset = 0 } = options;
  
  let query = 'SELECT * FROM articles';
  let params = [];
  let conditions = [];

  if (source && source !== 'all') {
    conditions.push('source = ?');
    params.push(source);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();
  
  let articles = results.map(row => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    source: row.source,
    categories: JSON.parse(row.categories || '["Local"]'), // Parse JSON array
    publishedAt: new Date(row.published_at * 1000),
    url: row.url
  }));
  
  // Filter by category in application (since JSON arrays are hard to index in SQLite)
  if (category && category !== 'all') {
    articles = articles.filter(article => 
      article.categories.includes(category)
    );
  }
  
  return articles;
}

// Clean up duplicate articles
async function cleanupDuplicates(env) {
  console.log('Starting duplicate cleanup...');
  
  // Get all articles
  const { results: allArticles } = await env.DB.prepare(`
    SELECT id, title, source FROM articles ORDER BY id
  `).all();
  
  const seen = new Set();
  const toDelete = [];
  
  for (const article of allArticles) {
    // Create a simple key from title + source
    const key = `${article.title.toLowerCase().trim()}-${article.source}`;
    
    if (seen.has(key)) {
      // This is a duplicate
      toDelete.push(article.id);
    } else {
      seen.add(key);
    }
  }
  
  // Delete the duplicates
  let totalRemoved = 0;
  for (const id of toDelete) {
    const { changes } = await env.DB.prepare(`DELETE FROM articles WHERE id = ?`).bind(id).run();
    totalRemoved += changes;
  }
  
  console.log(`✅ Cleanup complete. Removed ${totalRemoved} duplicate articles.`);
  return totalRemoved;
}

// Main news fetching function
async function fetchAndStoreNews(env) {
  console.log('Starting news fetch...');
  const parser = new SimpleRSSParser();
  let totalProcessed = 0;
  const tweetableArticles = [];

  for (const source of NEWS_SOURCES.rss) {
    try {
      console.log(`Fetching from ${source.name}...`);
      
      const feed = await parser.parseURL(source.url);
      let itemsProcessed = 0;

      for (const item of feed.items.slice(0, 200)) {
        if (isNHRelevant(item.title || '', item.description || item.content || '', source.name)) {
          const publishDate = new Date(item.pubDate || Date.now());
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          
          // Skip articles older than 6 months
          if (publishDate < sixMonthsAgo) {
            continue;
          }
          
          const article = {
            title: item.title || 'No title',
            summary: extractSummary(item.description || item.content || ''),
            source: source.name,
            categories: categorizeNews(item.title || '', item.description || item.content || '', source.name), // Now returns array
            publishedAt: publishDate,
            url: item.link || '#'
          };

          // Only count if it was actually added (not a duplicate)
          const wasAdded = await saveArticle(env, article);
          if (wasAdded) {
            itemsProcessed++;
            totalProcessed++;
            
            // Check if this article should be tweeted
            if (shouldTweetArticle(article)) {
              tweetableArticles.push(article);
            }
          }
        }
      }

      console.log(`✓ ${source.name}: ${itemsProcessed} new relevant items`);

    } catch (error) {
      console.error(`✗ ${source.name}: ${error.message}`);
    }
  }

  // Store last update timestamp
  await env.KV.put('last_updated', new Date().toISOString());
  
  // Tweet the most important articles and retweet journalists
  if (tweetableArticles.length > 0) {
    await tweetTopStories(env, tweetableArticles);
  }
  
  console.log(`✅ News fetch complete. Added ${totalProcessed} new articles. ${tweetableArticles.length} tweetable.`);
  return totalProcessed;
}

// Determine if an article should be tweeted
function shouldTweetArticle(article) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  
  // Breaking keywords that trigger immediate tweets
  const breakingKeywords = [
    'breaking', 'urgent', 'alert', 'just in', 'developing',
    'announces', 'signed', 'veto', 'passes', 'votes',
    'elected', 'resigns', 'appointed', 'emergency',
    'crisis', 'scandal', 'investigation', 'arrest'
  ];
  
  // Major NH sources that should always tweet (regardless of category)
  const majorTweetSources = [
    'WMUR', 'Union Leader', 'New Hampshire Bulletin', 
    'Granite Eagle Press', 'NH Journal'
  ];
  
  const hasBreakingKeyword = breakingKeywords.some(keyword => text.includes(keyword));
  const isMajorSource = majorTweetSources.includes(article.source);
  
  // Tweet if: breaking keyword OR from major source
  return hasBreakingKeyword || isMajorSource;
}

// Tweet top stories and retweet journalists
async function tweetTopStories(env, articles) {
  try {
    // Sort by importance (breaking keywords first, then major sources)
    const sortedArticles = articles.sort((a, b) => {
      const aText = `${a.title} ${a.summary}`.toLowerCase();
      const bText = `${b.title} ${b.summary}`.toLowerCase();
      
      const aBreaking = ['breaking', 'urgent', 'alert'].some(k => aText.includes(k));
      const bBreaking = ['breaking', 'urgent', 'alert'].some(k => bText.includes(k));
      
      if (aBreaking && !bBreaking) return -1;
      if (bBreaking && !aBreaking) return 1;
      
      return 0;
    });
    
    // Tweet the top 2 most important articles (reduced to leave room for retweets)
    const articlesToTweet = sortedArticles.slice(0, 2);
    
    for (const article of articlesToTweet) {
      await tweetArticle(env, article);
      // Wait 30 seconds between tweets
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    // Also look for NH journalist tweets to retweet
    await retweetNHJournalists(env);
    
    console.log(`📱 Tweeted ${articlesToTweet.length} articles and checked for retweets`);
    
  } catch (error) {
    console.error('Error tweeting articles:', error);
  }
}

// Create and send a tweet
async function tweetArticle(env, article) {
  try {
    const tweet = formatTweet(article);
    console.log('Attempting to tweet:', tweet);
    
    const tweetResponse = await postTweet(env, tweet);
    
    console.log('Tweet response status:', tweetResponse.status);
    const responseText = await tweetResponse.text();
    console.log('Tweet response body:', responseText);
    
    if (tweetResponse.ok) {
      console.log(`✅ Tweeted: ${article.title.substring(0, 50)}...`);
    } else {
      console.error('Tweet failed:', responseText);
      throw new Error(`Tweet failed: ${tweetResponse.status} - ${responseText}`);
    }
    
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
}

// Format article into tweet (using AP Style title)
function formatTweet(article) {
  const emojis = {
    'Politics': '🏛️',
    'Local': '📍',
    'Business': '💼',
    'Crime': '🚨',
    'Education': '🎓',
    'Weather': '🌤️',
    'Sports': '⚽'
  };
  
  // Use the first category for emoji, or first one with an emoji
  let emoji = '📰'; // default
  for (const category of article.categories) {
    if (emojis[category]) {
      emoji = emojis[category];
      break;
    }
  }
  
  const hashtags = '#NHPolitics #GraniteState #LiveFreeOrDie';
  
  // Shorten title if needed (Twitter has 280 char limit)
  let title = article.title; // Already in AP Style from database
  const baseLength = emoji.length + article.source.length + article.url.length + hashtags.length + 10; // spaces and formatting
  const maxTitleLength = 280 - baseLength;
  
  if (title.length > maxTitleLength) {
    title = title.substring(0, maxTitleLength - 3) + '...';
  }
  
  return `${emoji} ${title}

📰 ${article.source}
🔗 ${article.url}

${hashtags}`;
}

// Post tweet using X API v2.0 with OAuth 1.0a (required for write operations)
async function postTweet(env, text) {
  const url = 'https://api.twitter.com/2/tweets';
  
  console.log('Using OAuth 1.0a for tweet posting...');
  console.log('API Key exists:', !!env.TWITTER_API_KEY);
  console.log('Access Token exists:', !!env.TWITTER_ACCESS_TOKEN);
  
  // OAuth 1.0a parameters
  const oauth = {
    oauth_consumer_key: env.TWITTER_API_KEY,
    oauth_token: env.TWITTER_ACCESS_TOKEN,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).substring(2, 15),
    oauth_version: '1.0'
  };
  
  // For JSON body, we need to include the body hash in the signature
  const requestBody = JSON.stringify({ text: text });
  
  // Create parameter string for signature (OAuth params only, no body)
  const paramString = Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauth[key])}`)
    .join('&');
  
  const signatureBase = `POST&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  console.log('Signature base:', signatureBase);
  
  // Create signing key
  const signingKey = `${encodeURIComponent(env.TWITTER_API_SECRET)}&${encodeURIComponent(env.TWITTER_ACCESS_TOKEN_SECRET)}`;
  
  // Generate signature
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signatureBase)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  oauth.oauth_signature = signatureB64;
  
  // Create Authorization header - MUST be OAuth, not Bearer
  const authHeader = 'OAuth ' + Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauth[key])}"`)
    .join(', ');
  
  console.log('Auth header starts with:', authHeader.substring(0, 20));
  console.log('Request body:', requestBody);
  
  // Post the tweet - NO BEARER TOKEN!
  return fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader, // This should start with "OAuth" not "Bearer"
      'Content-Type': 'application/json'
    },
    body: requestBody
  });
}

// Retweet NH journalists and news accounts
async function retweetNHJournalists(env) {
  try {
    console.log('🔍 Checking NH journalists for retweets...');
    
    // Check a rotating subset to avoid rate limits (10 accounts per cycle)
    const accountsToCheck = NH_JOURNALISTS.slice(0, 10);
    let retweetCount = 0;
    
    for (const journalist of accountsToCheck) {
      try {
        // Get recent tweets from this journalist/outlet
        const tweets = await getRecentTweetsFromUser(env, journalist);
        
        // Look for NH-relevant tweets to retweet
        for (const tweet of tweets.slice(0, 2)) { // Max 2 per account
          if (shouldRetweetTweet(tweet) && retweetCount < 3) { // Max 3 retweets per cycle
            await retweetTweet(env, tweet.id);
            console.log(`🔄 Retweeted from @${journalist}: ${tweet.text.substring(0, 60)}...`);
            retweetCount++;
            
            // Wait between retweets to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 45000));
            break; // Only retweet 1 per account per cycle
          }
        }
        
        if (retweetCount >= 3) break; // Stop after 3 retweets
        
      } catch (error) {
        console.error(`Error checking @${journalist}:`, error.message);
      }
    }
    
    console.log(`✅ Retweet check complete. Made ${retweetCount} retweets.`);
    
  } catch (error) {
    console.error('Error in retweet process:', error);
  }
}

// Get recent tweets from a specific user
async function getRecentTweetsFromUser(env, username) {
  const query = `from:${username}`;
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=created_at,author_id`;
  
  const oauth = await createOAuthHeader(env, 'GET', url);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': oauth
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return data.data || [];
  } else {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
}

// Helper function to create OAuth header
async function createOAuthHeader(env, method, url) {
  const oauth = {
    oauth_consumer_key: env.TWITTER_API_KEY,
    oauth_token: env.TWITTER_ACCESS_TOKEN,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).substring(2, 15),
    oauth_version: '1.0'
  };
  
  const paramString = Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauth[key])}`)
    .join('&');
  
  const signatureBase = `${method}&${encodeURIComponent(url.split('?')[0])}&${encodeURIComponent(paramString)}`;
  
  const signingKey = `${encodeURIComponent(env.TWITTER_API_SECRET)}&${encodeURIComponent(env.TWITTER_ACCESS_TOKEN_SECRET)}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signatureBase)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  oauth.oauth_signature = signatureB64;
  
  return 'OAuth ' + Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauth[key])}"`)
    .join(', ');
}

// Determine if a tweet should be retweeted
function shouldRetweetTweet(tweet) {
  const text = tweet.text.toLowerCase();
  
  // NH-relevant keywords
  const nhKeywords = [
    'new hampshire', 'nh', 'granite state', 'live free or die',
    'concord', 'manchester', 'nashua', 'portsmouth', 'ayotte',
    'sununu', 'statehouse', 'nh politics', 'seacoast', 'lakes region'
  ];
  
  // Breaking news indicators
  const breakingKeywords = [
    'breaking', 'urgent', 'just in', 'developing', 'alert',
    'announcement', 'exclusive', 'confirmed', 'update'
  ];
  
  // Must be NH-relevant
  const isNHRelevant = nhKeywords.some(keyword => text.includes(keyword));
  
  // High priority if breaking news
  const isBreaking = breakingKeywords.some(keyword => text.includes(keyword));
  
  // Don't retweet replies or retweets
  const isOriginal = !tweet.text.startsWith('@') && !tweet.text.startsWith('RT');
  
  // Don't retweet if too old (older than 2 hours)
  const tweetTime = new Date(tweet.created_at);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const isRecent = tweetTime > twoHoursAgo;
  
  return isNHRelevant && isOriginal && isRecent && (isBreaking || Math.random() < 0.3); // 30% chance for non-breaking NH content
}

// Retweet a specific tweet
async function retweetTweet(env, tweetId) {
  const url = 'https://api.twitter.com/2/users/me/retweets';
  
  const oauth = {
    oauth_consumer_key: env.TWITTER_API_KEY,
    oauth_token: env.TWITTER_ACCESS_TOKEN,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).substring(2, 15),
    oauth_version: '1.0'
  };
  
  const requestBody = JSON.stringify({ tweet_id: tweetId });
  
  const paramString = Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauth[key])}`)
    .join('&');
  
  const signatureBase = `POST&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  
  const signingKey = `${encodeURIComponent(env.TWITTER_API_SECRET)}&${encodeURIComponent(env.TWITTER_ACCESS_TOKEN_SECRET)}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signatureBase)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  oauth.oauth_signature = signatureB64;
  
  const authHeader = 'OAuth ' + Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauth[key])}"`)
    .join(', ');
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: requestBody
  });
}

// ADD STATS ENDPOINT FUNCTION
async function getStats(env) {
  try {
    // Get total articles
    const totalArticles = await env.DB.prepare(`SELECT COUNT(*) as count FROM articles`).first();
    
    // Get total sources
    const totalSources = await env.DB.prepare(`SELECT COUNT(DISTINCT source) as count FROM articles`).first();
    
    // Get category breakdown
    const { results: articles } = await env.DB.prepare(`SELECT categories FROM articles`).all();
    const categoryBreakdown = {};
    
    articles.forEach(article => {
      try {
        const categories = JSON.parse(article.categories || '["Local"]');
        categories.forEach(category => {
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
        });
      } catch (error) {
        // Handle legacy single category articles
        const category = article.categories || 'Local';
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      }
    });

    return {
      totalArticles: totalArticles.count,
      totalSources: totalSources.count,
      categoryBreakdown
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      totalArticles: 0,
      totalSources: 0,
      categoryBreakdown: {}
    };
  }
}

// Request router
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize database
    await initDatabase(env);

    if (path === '/api/news') {
      const { searchParams } = url;
      const articles = await getArticles(env, {
        limit: parseInt(searchParams.get('limit')) || 100,
        category: searchParams.get('category'),
        source: searchParams.get('source'),
        offset: parseInt(searchParams.get('offset')) || 0
      });

      const lastUpdated = await env.KV.get('last_updated');

      return new Response(JSON.stringify({
        articles,
        total: articles.length,
        lastUpdated
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ADD NEWSLETTER ROUTES HERE
    if (path === '/api/newsletter/subscribe' && request.method === 'POST') {
      return handleNewsletterSubscribe(request, env);
    }

    if (path.startsWith('/api/newsletter/confirm/')) {
      return handleNewsletterConfirm(request, env);
    }

    if (path.startsWith('/api/newsletter/unsubscribe/')) {
      const token = path.split('/').pop();
      try {
        await env.DB.prepare(`DELETE FROM subscribers WHERE unsubscribe_token = ?`).bind(token).run();
        return new Response(`
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>👋 Successfully Unsubscribed</h1>
            <p>You've been unsubscribed from NH News Central newsletter.</p>
            <a href="https://nhnews.io" style="color: #2563eb;">Return to NH News Central</a>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      } catch (error) {
        return new Response('Error unsubscribing', { status: 500 });
      }
    }

    if (path === '/api/refresh' && request.method === 'POST') {
      const count = await fetchAndStoreNews(env);
      return new Response(JSON.stringify({
        success: true,
        message: 'News refreshed successfully',
        articleCount: count
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ADD STATS ENDPOINT
    if (path === '/api/stats') {
      const stats = await getStats(env);
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === '/api/test-tweet' && request.method === 'POST') {
      // Test tweet functionality
      const testArticle = {
        title: `Test ${Date.now()}: NH News Bot is Live and Monitoring New Hampshire Breaking News`,
        summary: 'This is a unique test tweet from the automated NH News aggregator system.',
        source: 'NH News Central',
        categories: ['Politics'],
        url: 'https://nhnews.io'
      };
      
      try {
        await tweetArticle(env, testArticle);
        return new Response(JSON.stringify({
          success: true,
          message: 'Test tweet sent successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (path === '/api/cleanup' && request.method === 'POST') {
      const duplicatesRemoved = await cleanupDuplicates(env);
      return new Response(JSON.stringify({
        success: true,
        message: 'Duplicates cleaned up',
        duplicatesRemoved
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === '/api/sources') {
      return new Response(JSON.stringify({
        rss: NEWS_SOURCES.rss.map(source => ({
          name: source.name,
          category: source.category,
          url: source.url
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === '/health') {
      const articleCount = await getArticles(env, { limit: 1 });
      return new Response(JSON.stringify({
        status: 'OK',
        timestamp: new Date().toISOString(),
        sourceCount: NEWS_SOURCES.rss.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Error handling request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Export for Cloudflare Workers
export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },

  // UPDATED SCHEDULED TRIGGER - includes newsletter sending
  async scheduled(event, env) {
    console.log('⏰ Scheduled trigger activated');
    
    // Always fetch news (every 30 minutes)
    await fetchAndStoreNews(env);
    
    // Send newsletter at 7 PM EST (23:00 UTC)
    const now = new Date();
    if (now.getUTCHours() === 23 && now.getUTCMinutes() === 0) {
      console.log('📧 Sending daily newsletter...');
      await sendDailyNewsletter(env);
    }
  }
};