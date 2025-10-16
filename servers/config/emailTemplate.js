export const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>{{subject}}</title>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" type="text/css">
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #1f2937;
    }
    table, td {
      border-collapse: collapse;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header {
      padding: 40px 30px;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    .logo-container img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      margin-right: 12px;
    }
    .logo-text {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.5px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .main-content {
      padding: 40px 35px;
      background: #ffffff;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      line-height: 1.7;
      color: #4b5563;
      margin-bottom: 25px;
    }
    .otp-container {
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
      border: 2px solid #e5e7eb;
    }
    .otp-label {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 15px;
    }
    .otp-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      border-radius: 10px;
      padding: 20px;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      display: inline-block;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    }
    .otp-validity {
      font-size: 14px;
      color: #6b7280;
      margin-top: 15px;
      font-weight: 500;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 36px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: transform 0.2s;
    }
    .warning-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .warning-box p {
      margin: 0;
      font-size: 14px;
      color: #92400e;
      line-height: 1.6;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background: linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%);
      border-top: 1px solid #e5e7eb;
    }
    .footer-logo {
      margin-bottom: 15px;
    }
    .footer-text {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.6;
      margin: 8px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);
      margin: 25px 0;
    }
    @media only screen and (max-width: 480px) {
      .container {
        width: 95% !important;
        margin: 20px auto !important;
      }
      .main-content {
        padding: 30px 20px !important;
      }
      .otp-box {
        font-size: 28px !important;
        letter-spacing: 4px !important;
      }
      .button {
        width: 100%;
        box-sizing: border-box;
      }
    }
  </style>
</head>
<body>
  <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center">
    <tbody>
      <tr>
        <td valign="top" align="center" style="padding: 20px;">
          <table class="container" width="600" cellspacing="0" cellpadding="0" border="0">
            <tbody>
              <tr>
                <td class="header">
                  <div class="logo-container">
                    <img src="https://readzio.com/logo.png" alt="readzio Logo" />
                    <span class="logo-text">readzio</span>
                  </div>
                  <h1>{{subject}}</h1>
                </td>
              </tr>
              <tr>
                <td class="main-content">
                  <div class="greeting">Hello {{name}},</div>
                  <div class="message">{{message}}</div>
                  
                  {{#if otp}}
                  <div class="otp-container">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-box">{{otp}}</div>
                    <div class="otp-validity">
                      Valid for {{#if isResetOtp}}15 minutes{{else}}1 hour{{/if}} • Keep it confidential
                    </div>
                  </div>
                  
                  <div class="warning-box">
                    <p><strong>Security Notice:</strong> If you didn't request this code, please contact our support team immediately to secure your account.</p>
                  </div>
                  {{/if}}
                  
                  {{#if hasButton}}
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="{{buttonUrl}}" class="button">{{buttonText}}</a>
                  </div>
                  {{/if}}
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <div class="footer-logo">
                    <img src="https://readzio.com/logo.png" alt="readzio" width="32" height="32" style="border-radius: 50%;" />
                  </div>
                  <div class="footer-text">
                    <strong>readzio Team</strong><br>
                    Need assistance? <a href="mailto:{{supportEmail}}">Contact Support</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

export const INVOICE_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" type="text/css">
    <style>
      body { 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
        padding: 20px; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
        margin: 0; 
      }
      .email-wrapper {
        max-width: 650px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px 30px;
        text-align: center;
        position: relative;
      }
      .header::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      }
      .logo-badge {
        display: inline-flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.95);
        padding: 10px 20px;
        border-radius: 50px;
        margin-bottom: 15px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      }
      .logo-badge img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        margin-right: 10px;
      }
      .logo-badge span {
        font-size: 20px;
        font-weight: 700;
        color: #111827;
      }
      h2 { 
        color: #ffffff; 
        font-size: 28px; 
        font-weight: 700; 
        margin: 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .content {
        padding: 40px 35px;
      }
      .success-badge {
        display: inline-flex;
        align-items: center;
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        color: #065f46;
        padding: 12px 24px;
        border-radius: 50px;
        font-weight: 600;
        margin-bottom: 25px;
        border: 2px solid #10b981;
      }
      .success-icon {
        width: 20px;
        height: 20px;
        background: #10b981;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: white;
        margin-right: 8px;
        font-size: 12px;
      }
      .invoice-card {
        background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        border-radius: 12px;
        overflow: hidden;
        margin: 25px 0;
        border: 2px solid #e5e7eb;
      }
      .invoice-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        font-weight: 600;
        font-size: 16px;
        text-align: center;
      }
      table { 
        width: 100%; 
        border-collapse: collapse;
      }
      .invoice-table td {
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 15px;
      }
      .invoice-table tr:last-child td {
        border-bottom: none;
      }
      .invoice-table td:first-child {
        font-weight: 600;
        color: #374151;
        width: 35%;
      }
      .invoice-table td:last-child {
        color: #1f2937;
      }
      .amount-highlight {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 700;
        font-size: 18px;
      }
      p { 
        font-size: 16px; 
        color: #4b5563; 
        line-height: 1.7; 
        margin: 15px 0;
      }
      .footer {
        background: linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%);
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
      }
      .footer-text {
        font-size: 14px;
        color: #6b7280;
        margin: 8px 0;
      }
      .download-btn {
        display: inline-block;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 14px 30px;
        border-radius: 10px;
        text-decoration: none;
        font-weight: 600;
        margin: 20px 0;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
      }
      @media only screen and (max-width: 600px) {
        .email-wrapper { margin: 10px; }
        .content { padding: 25px 20px !important; }
        .invoice-table td { padding: 12px 15px; font-size: 14px; }
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="header">
        <div class="logo-badge">
          <img src="https://readzio.com/logo.png" alt="readzio Logo" />
          <span>readzio</span>
        </div>
        <h2>Payment Successful!</h2>
      </div>
      
      <div class="content">
        <div style="text-align: center;">
          <div class="success-badge">
            <span class="success-icon">✓</span>
            Payment Confirmed
          </div>
        </div>
        
        <p style="font-size: 18px; font-weight: 600; color: #111827;">Dear {{name}},</p>
        <p>Thank you for your payment! Your transaction has been processed successfully. Here are your invoice details:</p>

        <div class="invoice-card">
          <div class="invoice-header">Invoice Details</div>
          <table class="invoice-table">
            <tr>
              <td>Invoice ID</td>
              <td><strong>{{invoice.invoiceId}}</strong></td>
            </tr>
            <tr>
              <td>Order ID</td>
              <td>{{invoice.orderId}}</td>
            </tr>
            <tr>
              <td>Payment ID</td>
              <td>{{invoice.paymentId}}</td>
            </tr>
            <tr>
              <td>Amount</td>
              <td class="amount-highlight">₹ {{invoice.amount}}</td>
            </tr>
            <tr>
              <td>Currency</td>
              <td>{{invoice.currency}}</td>
            </tr>
            <tr>
              <td>Date</td>
              <td>{{invoice.date}}</td>
            </tr>
          </table>
        </div>

        <p>This invoice serves as your official payment receipt. Keep it for your records.</p>
        <p style="font-size: 14px; color: #6b7280;">For any questions or concerns, please don't hesitate to contact our support team.</p>
      </div>

      <div class="footer">
        <img src="https://readzio.com/logo.png" alt="readzio" width="32" height="32" style="border-radius: 50%; margin-bottom: 10px;" />
        <div class="footer-text">
          <strong>readzio Team</strong><br>
          Questions? Contact us at <a href="mailto:support@readzio.com" style="color: #667eea; text-decoration: none; font-weight: 600;">support@readzio.com</a>
        </div>
      </div>
    </div>
  </body>
</html>`;

export const WELCOME_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{{subject}}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" type="text/css">
    <style>
      body {
        margin: 0;
        padding: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .wrapper {
        padding: 40px 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.3);
      }
      .hero {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 50px 30px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .hero::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        animation: pulse 4s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.5; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
      .logo-welcome {
        position: relative;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.95);
        padding: 14px 28px;
        border-radius: 50px;
        margin-bottom: 25px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }
      .logo-welcome img {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        margin-right: 14px;
      }
      .logo-welcome span {
        font-size: 24px;
        font-weight: 800;
        color: #111827;
        letter-spacing: -0.5px;
      }
      .hero h1 {
        position: relative;
        z-index: 2;
        margin: 0 0 15px;
        color: white;
        font-size: 36px;
        font-weight: 800;
        letter-spacing: -1px;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .hero-subtitle {
        position: relative;
        z-index: 2;
        color: rgba(255, 255, 255, 0.95);
        font-size: 18px;
        line-height: 1.6;
        max-width: 450px;
        margin: 0 auto;
      }
      .content {
        padding: 45px 35px;
      }
      .welcome-message {
        font-size: 17px;
        line-height: 1.8;
        color: #374151;
        text-align: center;
        margin-bottom: 35px;
      }
      .feature-grid {
        display: table;
        width: 100%;
        margin: 30px 0;
      }
      .feature-row {
        display: table-row;
      }
      .feature-item {
        display: table-cell;
        padding: 20px;
        text-align: center;
        vertical-align: top;
      }
      .feature-icon {
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 24px;
        margin-bottom: 12px;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      }
      .feature-title {
        font-size: 16px;
        font-weight: 700;
        color: #111827;
        margin: 8px 0;
      }
      .feature-desc {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
      }
      .cta-section {
        text-align: center;
        margin: 35px 0;
        padding: 35px;
        background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        border-radius: 16px;
      }
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 18px 40px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 700;
        font-size: 17px;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        transition: transform 0.2s;
      }
      .footer {
        background: linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%);
        padding: 35px 30px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
      }
      .footer-logo {
        margin-bottom: 15px;
      }
      .footer-text {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.7;
        margin: 8px 0;
      }
      .footer-link {
        color: #667eea;
        text-decoration: none;
        font-weight: 600;
      }
      @media only screen and (max-width: 600px) {
        .container { border-radius: 12px; margin: 10px; }
        .hero { padding: 40px 20px; }
        .hero h1 { font-size: 28px; }
        .content { padding: 30px 20px; }
        .feature-item { display: block; padding: 15px 0; }
        .cta-button { padding: 16px 32px; font-size: 16px; }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="hero">
          <div class="logo-welcome">
            <img src="https://readzio.com/logo.png" alt="readzio Logo" />
            <span>readzio</span>
          </div>
          <h1>Welcome, {{name}}! 🎉</h1>
          <p class="hero-subtitle">{{message}}</p>
        </div>
        
        <div class="content">
          <p class="welcome-message">
            We're absolutely thrilled to have you join our community! Get ready to embark on an amazing journey with powerful tools and features designed just for you.
          </p>

          <div class="feature-grid">
            <div class="feature-row">
              <div class="feature-item">
                <div class="feature-icon">📚</div>
                <div class="feature-title">Vast Library</div>
                <div class="feature-desc">Access thousands of resources</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🚀</div>
                <div class="feature-title">Fast & Easy</div>
                <div class="feature-desc">Intuitive interface</div>
              </div>
            </div>
            <div class="feature-row">
              <div class="feature-item">
                <div class="feature-icon">🤝</div>
                <div class="feature-title">Community</div>
                <div class="feature-desc">Connect with others</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">💡</div>
                <div class="feature-title">Smart Tools</div>
                <div class="feature-desc">AI-powered features</div>
              </div>
            </div>
          </div>

          {{#if hasButton}}
          <div class="cta-section">
            <p style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 20px;">Ready to get started?</p>
            <a href="{{buttonUrl}}" class="cta-button">{{buttonText}}</a>
          </div>
          {{/if}}
        </div>

        <div class="footer">
          <div class="footer-logo">
            <img src="https://readzio.com/logo.png" alt="readzio" width="36" height="36" style="border-radius: 50%;" />
          </div>
          <div class="footer-text">
            <strong>Questions or need help?</strong><br>
            We're here for you at <a href="mailto:{{supportEmail}}" class="footer-link">{{supportEmail}}</a>
          </div>
          <div class="footer-text" style="margin-top: 15px; font-size: 13px;">
            © 2025 readzio. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

export const REPLY_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>{{subject}}</title>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" type="text/css">
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #1f2937;
    }
    table, td {
      border-collapse: collapse;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header {
      padding: 40px 30px;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    .logo-container img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      margin-right: 12px;
    }
    .logo-text {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.5px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .main-content {
      padding: 40px 35px;
      background: #ffffff;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
    }
    .message-box {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      border-left: 4px solid #667eea;
      border-radius: 8px;
      padding: 24px;
      margin: 25px 0;
    }
    .message-box p {
      font-size: 16px;
      line-height: 1.8;
      color: #374151;
      margin: 0;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background: linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%);
      border-top: 1px solid #e5e7eb;
    }
    .footer-logo {
      margin-bottom: 15px;
    }
    .footer-text {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.6;
      margin: 8px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      font-size: 15px;
      color: #6b7280;
    }
    .signature strong {
      color: #111827;
      display: block;
      margin-bottom: 5px;
    }
    @media only screen and (max-width: 480px) {
      .container {
        width: 95% !important;
        margin: 20px auto !important;
      }
      .main-content {
        padding: 30px 20px !important;
      }
      .message-box {
        padding: 18px !important;
      }
    }
  </style>
</head>
<body>
  <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center">
    <tbody>
      <tr>
        <td valign="top" align="center" style="padding: 20px;">
          <table class="container" width="600" cellspacing="0" cellpadding="0" border="0">
            <tbody>
              <tr>
                <td class="header">
                  <div class="logo-container">
                    <img src="https://readzio.com/logo.png" alt="readzio Logo" />
                    <span class="logo-text">readzio</span>
                  </div>
                  <h1>{{subject}}</h1>
                </td>
              </tr>
              <tr>
                <td class="main-content">
                  <div class="greeting">Hello {{name}},</div>
                  
                  <div class="message-box">
                    <p>{{message}}</p>
                  </div>
                  
                  <div class="signature">
                    <strong>Best regards,</strong>
                    The readzio Team
                  </div>
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <div class="footer-logo">
                    <img src="https://readzio.com/logo.png" alt="readzio" width="32" height="32" style="border-radius: 50%;" />
                  </div>
                  <div class="footer-text">
                    <strong>readzio Support</strong><br>
                    Have questions? <a href="mailto:{{supportEmail}}">Contact us</a>
                  </div>
                  <div class="footer-text" style="margin-top: 15px; font-size: 12px;">
                    © 2025 readzio. All rights reserved.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
