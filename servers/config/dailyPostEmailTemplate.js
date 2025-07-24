export const DAILY_POST_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{subject}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    body {
      font-family: 'Lato', sans-serif;
      background-color: #f7f7f7;
      margin: 0;
      padding: 0;
      color: #333333;
    }
    .email-wrapper {
      max-width: 700px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .header {
      padding: 30px;
      text-align: center;
      background: #ffffff;
      border-bottom: 1px solid #e0e0e0;
    }
    .header img {
      height: 50px;
      margin-bottom: 10px;
    }
    .header h1 {
      font-size: 22px;
      margin: 0;
      color: #1a73e8;
    }
    .content {
      padding: 25px;
    }
    .content p {
      font-size: 16px;
      margin-bottom: 16px;
      color: #555555;
    }
    .post {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .post img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
    }
    .post-content {
      padding: 15px;
    }
    .post-title {
      font-size: 18px;
      font-weight: bold;
      color: #1a73e8;
      text-decoration: none;
      display: block;
      margin-bottom: 6px;
    }
    .post-author {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: #757575;
      margin-bottom: 8px;
    }
    .author-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .post-meta {
      display: flex;
      font-size: 14px;
      color: #757575;
      gap: 16px;
      margin-bottom: 12px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .read-more {
      font-size: 14px;
      color: #34a853;
      font-weight: bold;
      text-decoration: none;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      padding: 25px;
      color: #757575;
      border-top: 1px solid #e0e0e0;
      background: #f7f7f7;
    }
    .footer a {
      color: #1a73e8;
      text-decoration: none;
    }
    .button-wrapper {
      margin-top: 20px;
      text-align: center;
    }
    .button-wrapper a.button {
      background-color: #1a73e8;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: bold;
    }
    @media (max-width: 600px) {
      .email-wrapper {
        margin: 10px;
      }
      .content {
        padding: 20px;
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
      <p>Dear {{name}},</p>
      <p>Here are your top recommended reads for today:</p>

      {{#each posts}}
      <div class="post">
        {{#if this.thumbnail}}
          <img src="{{this.thumbnail}}" alt="{{this.title}}" />
        {{/if}}

        <div class="post-content">
          <a href="https://inksha.onrender.com/post/{{this.slug}}" class="post-title">{{this.title}}</a>

          <div class="post-author">
            {{#if this.author.avatar}}
              <img src="{{this.author.avatar}}" alt="{{this.author.name}}" class="author-avatar" />
            {{/if}}
            by {{this.author.name}}
          </div>

          <div class="post-meta">
            <div class="meta-item">📖 <span>{{#if this.readTime}}{{this.readTime}}{{else}}0 min{{/if}}</span></div>
            <div class="meta-item">❤️ <span>{{#if this.likesCount}}{{this.likesCount}}{{else}}0{{/if}}</span></div>
            <div class="meta-item">💬 <span>{{#if this.commentsCount}}{{this.commentsCount}}{{else}}0{{/if}}</span></div>
          </div>

          <a href="https://inksha.onrender.com/post/{{this.slug}}" class="read-more">Read More</a>
        </div>
      </div>
      {{/each}}

      {{#unless posts.length}}
      <p>No new posts available today. Explore more at <a href="https://inksha.onrender.com">Inksha</a>.</p>
      {{/unless}}

      {{#if hasButton}}
      <div class="button-wrapper">
        <a href="{{buttonUrl}}" class="button">{{buttonText}}</a>
      </div>
      {{/if}}
    </div>

    <div class="footer">
      This email was sent to you as part of your Inksha subscription.<br />
      Need help? Contact <a href="mailto:{{supportEmail}}">support</a>.
    </div>
  </div>
</body>
</html>`;
