export const DAILY_POST_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>{{subject}}</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    body {
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
      color: #111827;
    }
    .email-wrapper {
      max-width: 680px;
      margin: 0 auto;
      background: #fff;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .header {
      padding: 30px 24px 20px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .header img {
      height: 40px;
      margin-bottom: 12px;
    }
    .header h1 {
      font-size: 26px;
      margin: 0;
      font-weight: 700;
    }
    .content {
      padding: 24px;
    }
    .content p {
      margin-top: 0;
      font-size: 15px;
      line-height: 1.6;
    }
    .post {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 18px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .post:last-child {
      border-bottom: none;
    }
    .post img {
      width: 120px;
      height: auto;
      border-radius: 4px;
      object-fit: cover;
    }
    .post-content {
      flex: 1;
    }
    .post-title {
      font-size: 17px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 6px;
      text-decoration: none;
    }
    .post-author {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .post-meta {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 6px;
    }
    .post-meta span {
      margin-right: 16px;
    }
    .read-more {
      font-size: 13px;
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }
    .button-wrapper {
      margin: 36px 0 12px;
      text-align: center;
    }
    .button {
      background-color: #2563eb;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      display: inline-block;
    }
    .footer {
      font-size: 12px;
      text-align: center;
      color: #9ca3af;
      padding: 20px;
      background: #f9fafb;
    }
    .footer a {
      color: #4F46E5;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .post {
        flex-direction: column;
      }
      .post img {
        width: 100%;
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
          <img src="{{this.thumbnail}}" alt="{{this.title}}">
        {{/if}}
        <div class="post-content">
          <a class="post-title" href="https://inksha.onrender.com/post/{{this.slug}}">{{this.title}}</a>
          <div class="post-author">by {{this.author.name}}</div>
          <div class="post-meta">
            <span>📖 {{this.readTime}}</span>
            <span>❤️ {{this.likesCount}}</span>
            <span>💬 {{this.commentsCount}}</span>
          </div>
          <a class="read-more" href="https://inksha.onrender.com/post/{{this.slug}}">Read more →</a>
        </div>
      </div>
      {{/each}}

      {{#unless posts.length}}
        <p>No new posts today. Explore more on <a href="https://inksha.onrender.com" style="color: #2563eb;">Inksha</a>.</p>
      {{/unless}}

      {{#if hasButton}}
      <div class="button-wrapper">
        <a href="{{buttonUrl}}" class="button">{{buttonText}}</a>
      </div>
      {{/if}}
    </div>
    <div class="footer">
      You’re receiving this email because you subscribed to Inksha.<br />
      Need help? <a href="mailto:{{supportEmail}}">Contact support</a>
    </div>
  </div>
</body>
</html>`;
