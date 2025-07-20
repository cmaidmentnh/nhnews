// Newsletter implementation for Cloudflare Workers
// Add this to your worker.js file

import { Resend } from 'resend';

// Initialize Resend
function getResend(env) {
  return new Resend(env.RESEND_API_KEY);
}

// Generate random tokens
function generateToken() {
  return crypto.randomUUID();
}

// Newsletter subscription handler
async function handleNewsletterSubscribe(request, env) {
  try {
    const { email } = await request.json();
    
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
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
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
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
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all;">
              https://nhnews.io/api/newsletter/confirm/${confirmationToken}
            </p>
            
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
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
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
        <p>Email: <strong>${subscriber.email}</strong></p>
        <a href="https://nhnews.io" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; display: inline-block;">
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

// Unsubscribe handler
async function handleNewsletterUnsubscribe(request, env) {
  const url = new URL(request.url);
  const token = url.pathname.split('/').pop();

  try {
    const subscriber = await env.DB.prepare(`
      SELECT id, email FROM subscribers WHERE unsubscribe_token = ?
    `).bind(token).first();

    if (!subscriber) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Invalid Unsubscribe Link</h1>
          <p>This unsubscribe link is invalid.</p>
          <a href="https://nhnews.io" style="color: #2563eb;">Return to NH News Central</a>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Remove subscriber
    await env.DB.prepare(`
      DELETE FROM subscribers WHERE id = ?
    `).bind(subscriber.id).run();

    return new Response(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>👋 Successfully Unsubscribed</h1>
        <p>You've been unsubscribed from NH News Central newsletter.</p>
        <p>Email: <strong>${subscriber.email}</strong></p>
        <p>We're sorry to see you go!</p>
        <a href="https://nhnews.io" style="color: #2563eb;">Return to NH News Central</a>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Generate newsletter HTML
function generateNewsletterHTML(articles) {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const articleHTML = articles.map(article => `
    <div style="border-bottom: 1px solid #e5e7eb; padding: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937;">
        <a href="${article.url}" style="color: #1f2937; text-decoration: none;">${article.title}</a>
      </h3>
      <p style="color: #6b7280; margin: 10px 0; line-height: 1.5;">${article.summary}</p>
      <div style="font-size: 14px; color: #9ca3af;">
        <span>🏢 ${article.source}</span> • 
        <span>🕒 ${new Date(article.published_at).toLocaleTimeString()}</span>
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
          <p style="font-size: 12px; color: #9ca3af;">
            NH News Central - Live Free or Die State News
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
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

    console.log(`Found ${subscribers.results.length} confirmed subscribers`);

    // Get today's articles
    const articles = await env.DB.prepare(`
      SELECT title, summary, url, source, published_at 
      FROM articles 
      WHERE DATE(published_at) >= DATE('now', '-1 day', 'localtime')
      ORDER BY published_at DESC 
      LIMIT 15
    `).all();

    if (articles.results.length === 0) {
      console.log('No articles found for today');
      return;
    }

    console.log(`Found ${articles.results.length} articles for newsletter`);

    const resend = getResend(env);
    const baseEmailHTML = generateNewsletterHTML(articles.results);

    // Send to all subscribers
    let successCount = 0;
    for (const subscriber of subscribers.results) {
      try {
        const emailHTML = baseEmailHTML.replace('{{UNSUBSCRIBE_TOKEN}}', subscriber.unsubscribe_token);
        
        await resend.emails.send({
          from: 'NH News Central <newsletter@nhnews.io>',
          to: subscriber.email,
          subject: `NH News Daily - ${new Date().toLocaleDateString()}`,
          html: emailHTML
        });
        
        successCount++;
      } catch (emailError) {
        console.error(`Failed to send to ${subscriber.email}:`, emailError);
      }
    }

    console.log(`Newsletter sent successfully to ${successCount}/${subscribers.results.length} subscribers`);

  } catch (error) {
    console.error('Daily newsletter error:', error);
  }
}

// CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

// Add these routes to your main worker fetch handler:
/*
if (url.pathname === '/api/newsletter/subscribe' && request.method === 'POST') {
  return handleNewsletterSubscribe(request, env);
}

if (url.pathname.startsWith('/api/newsletter/confirm/')) {
  return handleNewsletterConfirm(request, env);
}

if (url.pathname.startsWith('/api/newsletter/unsubscribe/')) {
  return handleNewsletterUnsubscribe(request, env);
}
*/

// Add this to your scheduled handler:
/*
export default {
  async scheduled(event, env, ctx) {
    // Your existing cron jobs...
    
    // Check if it's the newsletter time (7 PM EST = 23:00 UTC)
    const now = new Date();
    if (now.getUTCHours() === 23 && now.getUTCMinutes() === 0) {
      ctx.waitUntil(sendDailyNewsletter(env));
    }
  },
  
  async fetch(request, env) {
    // Your existing routes...
  }
};
*/

export {
  handleNewsletterSubscribe,
  handleNewsletterConfirm,
  handleNewsletterUnsubscribe,
  sendDailyNewsletter
};