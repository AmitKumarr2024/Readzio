export const DAILY_POST_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>{{subject}}</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    body {
      background: #f5f5f5;
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
      color: #333;
    }
    .email-wrapper {
      max-width: 640px;
      margin: 0 auto;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #6B46C1 0%, #4F46E5 100%);
      padding: 30px 20px;
      text-align: center;
      color: #fff;
    }
    .header img {
      height: 50px;
      margin-bottom: 10px;
    }
    .header h1 {
      font-size: 22px;
      margin: 0;
      font-weight: 600;
    }
    .content {
      padding: 30px 24px;
    }
    .content p {
      margin-top: 0;
      font-size: 16px;
      line-height: 1.6;
    }
    .post {
      margin-top: 24px;
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
      transition: box-shadow 0.3s;
    }
    .post:hover {
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
    }
    .post img {
      width: 100%;
      display: block;
    }
    .post-content {
      padding: 16px;
    }
    .post-title {
      font-size: 18px;
      color: #4F46E5;
      font-weight: 600;
      margin: 0 0 8px;
      text-decoration: none;
    }
    .post-author {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    .post-meta {
      font-size: 13px;
      color: #777;
      margin-bottom: 12px;
    }
    .read-more {
      font-size: 14px;
      color: #22D172;
      text-decoration: none;
      font-weight: 600;
    }
    .button-wrapper {
      margin: 30px 0;
      text-align: center;
    }
    .button {
      background-color: #22D172;
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      display: inline-block;
    }
    .footer {
      font-size: 13px;
      text-align: center;
      color: #888;
      padding: 20px;
      background: #f9f9f9;
    }
    .footer a {
      color: #4F46E5;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .content {
        padding: 20px;
      }
      .post-title {
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <img src="https://inksha.onrender.com/public/logo.png" alt="Inksha Logo" />
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
            📖 {{this.readTime}} &nbsp;|&nbsp; ❤️ {{this.likesCount}} &nbsp;|&nbsp; 💬 {{this.commentsCount}}
          </div>
          <a class="read-more" href="https://inksha.onrender.com/post/{{this.slug}}">Read more →</a>
        </div>
      </div>
      {{/each}}

      {{#unless posts.length}}
        <p>No new posts today. But there’s always something worth reading on <a href="https://inksha.onrender.com/" style="color: #4F46E5;">Inksha</a>.</p>
      {{/unless}}

      {{#if hasButton}}
      <div class="button-wrapper">
        <a href="{{buttonUrl}}" class="button">{{buttonText}}</a>
      </div>
      {{/if}}
    </div>
    <div class="footer">
      You're receiving this email because you're subscribed to Inksha.<br />
      Need help? <a href="mailto:{{supportEmail}}">Contact support</a>
    </div>
  </div>
</body>
</html>`;
