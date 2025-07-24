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
      border-bottom: 1px solid #e0e0e0;
      background: #ffffff;
    }
    .header img {
      height: 50px;
      margin-bottom: 15px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0;
      color: #1a73e8;
    }
    .content {
      padding: 30px;
    }
    .content p {
      font-size: 16px;
      margin: 0 0 20px;
      color: #555555;
    }
    .post {
      width: 100%;
      margin-bottom: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
    .post img {
      width: 100%;
      height: auto;
      border-radius: 8px 8px 0 0;
      object-fit: cover;
    }
    .post-content {
      padding: 15px;
    }
    .post-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a73e8;
      margin: 0 0 8px;
      text-decoration: none;
    }
    .post-author {
      font-size: 14px;
      color: #757575;
      margin-bottom: 6px;
    }
    .post-meta {
font-size: 20px;
color: #9e9e9e;
margin-bottom: 6px;
display: flex;
justify-content: space-between;
}

.post-meta span {
margin-right: 0;
}
    .read-more {
      font-size: 14px;
      color: #34a853;
      text-decoration: none;
      font-weight: 700;
    }
    .footer {
      background-color: #f7f7f7;
      padding: 25px;
      text-align: center;
      font-size: 12px;
      color: #757575;
      border-top: 1px solid #e0e0e0;
    }
    .footer a {
      color: #1a73e8;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .email-wrapper {
        margin: 10px;
      }
      .post img {
        width: 100%;
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
      <p>Please find below your curated selection of top reads for today from Inksha:</p>

      {{#each posts}}
      <div class="post">
        {{#if this.thumbnail}}
          <img src="{{this.thumbnail}}" alt="{{this.title}}" />
        {{/if}}
        <div class="post-content">
          <a href="https://inksha.onrender.com/post/{{this.slug}}" class="post-title">{{this.title}}</a>
          <div class="post-author">
  <img src="{{this.author.avatar}}" alt="{{this.author.name}}" style="width:24px;height:24px;border-radius:50%;margin-right:8px;" />
  by {{this.author.name}}
</div>

          <div class="post-meta">
  <span>📖 {{#if this.readTime}}{{this.readTime}}{{else}}0 min{{/if}}</span>
  <span>❤️ {{#if this.likesCount}}{{this.likesCount}}{{else}}0{{/if}}</span>
  <span>💬 {{#if this.commentsCount}}{{this.commentsCount}}{{else}}0{{/if}}</span>
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
      This email is sent to you as part of your Inksha subscription.<br/>
      For assistance, please contact <a href="mailto:{{supportEmail}}">support</a>.
    </div>
  </div>
</body>
</html>`;
