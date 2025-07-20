import React from 'react';

const PrivacyPolicy = ({ onClose }) => {
  return (
    <div className="privacy-policy-overlay">
      <div className="privacy-policy-modal">
        <div className="privacy-policy-header">
          <h2>Privacy Policy</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="privacy-policy-content">
          <p><em>Last updated: July 19, 2025</em></p>

          <h3>Introduction</h3>
          <p>NH News Central ("we," "our," or "us") operates the website nhnews.io (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.</p>

          <h3>Information We Collect</h3>
          <h4>Newsletter Subscriptions</h4>
          <ul>
            <li><strong>Email Address</strong>: When you subscribe to our NH Politics Daily newsletter, we collect and store your email address.</li>
            <li><strong>Subscription Preferences</strong>: We track your subscription status and preferences for newsletter delivery.</li>
          </ul>

          <h4>Automatically Collected Information</h4>
          <ul>
            <li><strong>Usage Data</strong>: Information about how you access and use the Service, including your IP address, browser type, browser version, pages visited, time and date of visit, time spent on pages, and other diagnostic data.</li>
            <li><strong>Cookies and Tracking</strong>: We use cookies and similar tracking technologies to track activity on our Service and hold certain information.</li>
          </ul>

          <h4>Third-Party Services</h4>
          <h5>Google AdSense</h5>
          <p>We use Google AdSense to display advertisements. Google AdSense uses cookies to serve ads based on your prior visits to our website or other websites. You may opt out of personalized advertising by visiting <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</p>

          <h5>Google Tag Manager</h5>
          <p>We use Google Tag Manager to manage website tags and analytics. This helps us understand how visitors use our website.</p>

          <h3>How We Use Information</h3>
          <p>We use the collected data for various purposes:</p>
          <ul>
            <li>To provide and maintain our Service</li>
            <li>To send you our daily political newsletter (if subscribed)</li>
            <li>To notify you about changes to our Service</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information to improve our Service</li>
            <li>To monitor usage of our Service</li>
            <li>To detect, prevent and address technical issues</li>
          </ul>

          <h3>Newsletter Communications</h3>
          <ul>
            <li>We send daily political news summaries to subscribers at 7 PM EST</li>
            <li>All newsletters include an unsubscribe link</li>
            <li>You can unsubscribe at any time by clicking the unsubscribe link in any email</li>
            <li>We use Resend as our email service provider</li>
          </ul>

          <h3>Data Sharing and Disclosure</h3>
          <p>We do not sell, trade, or otherwise transfer your personal information to third parties, except as described in this Privacy Policy:</p>
          <ul>
            <li><strong>Service Providers</strong>: We may employ third-party companies (like Google AdSense, Google Tag Manager, and Resend) to facilitate our Service</li>
            <li><strong>Legal Requirements</strong>: We may disclose your information if required by law or in response to valid requests by public authorities</li>
          </ul>

          <h3>Your Data Protection Rights</h3>
          <p>Depending on your location, you may have the following rights:</p>
          <ul>
            <li><strong>Access</strong>: Request copies of your personal data</li>
            <li><strong>Rectification</strong>: Request correction of inaccurate data</li>
            <li><strong>Erasure</strong>: Request deletion of your personal data</li>
            <li><strong>Restrict Processing</strong>: Request restriction of processing your personal data</li>
            <li><strong>Data Portability</strong>: Request transfer of your data to another organization</li>
            <li><strong>Object</strong>: Object to our processing of your personal data</li>
          </ul>

          <h3>Children's Privacy</h3>
          <p>Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13.</p>

          <h3>Data Retention</h3>
          <ul>
            <li><strong>Newsletter Data</strong>: We retain your email address until you unsubscribe</li>
            <li><strong>Analytics Data</strong>: Automatically collected data is retained for up to 26 months</li>
          </ul>

          <h3>Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us:</p>
          <ul>
            <li><strong>Email</strong>: privacy@nhnews.io</li>
            <li><strong>Website</strong>: <a href="https://nhnews.io" target="_blank" rel="noopener noreferrer">nhnews.io</a></li>
          </ul>

          <h3>Changes to This Privacy Policy</h3>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>

          <h3>Compliance</h3>
          <p>This Privacy Policy complies with:</p>
          <ul>
            <li>General Data Protection Regulation (GDPR)</li>
            <li>California Consumer Privacy Act (CCPA)</li>
            <li>Google AdSense Publisher Policies</li>
            <li>CAN-SPAM Act (for email communications)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;