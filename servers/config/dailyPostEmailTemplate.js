export const DAILY_POST_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{subject}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
      color: #111827;
    }
    .email-wrapper {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      padding: 24px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .header img {
      height: 40px;
      margin-bottom: 12px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0;
      color: #6b21a8;
    }
    .content {
      padding: 24px;
    }
    .content p {
      font-size: 15px;
      margin: 0 0 16px;
    }
    .post {
      display: flex;
      gap: 16px;
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 0;
    }
    .post img {
      width: 96px;
      height: 96px;
      border-radius: 6px;
      object-fit: cover;
    }
    .post-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .post-title {
      font-size: 16px;
      font-weight: 600;
      color: #2563eb;
      margin: 0 0 6px;
      text-decoration: none;
    }
    .post-author {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .post-meta {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    .post-meta span {
      margin-right: 12px;
    }
    .read-more {
      font-size: 13px;
      color: #10b981;
      text-decoration: none;
      font-weight: 500;
    }
    .button-wrapper {
      margin: 32px 0 0;
      text-align: center;
    }
    .button {
      background-color: #2563eb;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      text-decoration: none;
      font-weight: 600;
    }
    .footer {
      background-color: #f3f4f6;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .footer a {
      color: #4f46e5;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .post {
        flex-direction: column;
        align-items: flex-start;
      }
      .post img {
        width: 100%;
        height: auto;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <img src="https://inksha.onrender.com/public/logo1.png" alt="Inksha Logo" />
      <h1>{{subject}}</h1>
    </div>
    <div class="content">
      <p>Hi {{name}},</p>
      <p>Here are your top reads today from Inksha:</p>

      {{#each posts}}
      <div class="post">
        {{#if this.thumbnail}}
          <img src="{{this.thumbnail}}" alt="{{this.title}}" />
        {{/if}}
        <div class="post-content">
          <a href="https://inksha.onrender.com/post/{{this.slug}}" class="post-title">{{this.title}}</a>
          <div class="post-author">by {{this.author.name}}</div>
          <div class="post-meta">
            <span>📖 {{this.readTime}}</span>
            <span>❤️ {{this.likesCount}}</span>
            <span>💬 {{this.commentsCount}}</span>
          </div>
          <a href="https://inksha.onrender.com/post/{{this.slug}}" class="read-more">Read more →</a>
        </div>
      </div>
      {{/each}}

      {{#unless posts.length}}
        <p>No new posts today. Discover more on <a href="https://inksha.onrender.com">Inksha</a>.</p>
      {{/unless}}

      {{#if hasButton}}
      <div class="button-wrapper">
        <a href="{{buttonUrl}}" class="button">{{buttonText}}</a>
      </div>
      {{/if}}
    </div>
    <div class="footer">
      You're receiving this email because you're subscribed to Inksha.<br/>
      Need help? <a href="mailto:{{supportEmail}}">Contact support</a>
    </div>
  </div>
</body>
</html>`;
