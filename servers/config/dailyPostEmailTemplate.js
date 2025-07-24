export const DAILY_POST_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{subject}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
      color: #1f2937;
    }
    .email-wrapper {
      max-width: 700px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #e0f2fe, #f0f9ff);
      padding: 40px 30px;
      text-align: center;
    }
    .header img {
      height: 50px;
      margin-bottom: 15px;
    }
    .header h1 {
      font-size: 24px;
      color: #0f172a;
      margin: 0;
      font-weight: 700;
    }
    .content {
      padding: 30px;
    }
    .content p {
      font-size: 16px;
      margin-bottom: 20px;
      line-height: 1.6;
      color: #374151;
    }
    .post {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 30px;
      transition: box-shadow 0.2s ease-in-out;
    }
    .post:hover {
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
    }
    .post img {
      width: 100%;
      max-height: 240px;
      object-fit: cover;
      display: block;
    }
    .post-content {
      padding: 20px 24px;
    }
    .post-title {
      font-size: 20px;
      color: #1d4ed8;
      font-weight: 700;
      text-decoration: none;
      margin-bottom: 10px;
      display: block;
    }
    .post-title:hover {
      color: #1e40af;
    }
    .post-author {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    .author-avatar {
      width: 2px;
      height: 2px;
      border-radius: 50%;
      margin-right: 10px;
      object-fit: contain;
      border: 1px solid #d1d5db;
    }
    .post-meta {
      display: flex;
      gap: 6px;
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 15px;
    }
    .meta-item {
      display: flex;
      justify-content:center;
      align-items: center;
      gap: 6px;
    }
    .read-more {
      display: inline-block;
      font-size: 14px;
      color: #10b981;
      font-weight: 600;
      text-decoration: none;
      border: 1px solid #10b981;
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.3s ease;
    }
    .read-more:hover {
      background: #10b981;
      color: #fff;
    }
    .button-wrapper {
      text-align: center;
      margin-top: 35px;
    }
    .button-wrapper a.button {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      display: inline-block;
      transition: background 0.3s ease;
    }
    .button-wrapper a.button:hover {
      background: #1d4ed8;
    }
    .footer {
      font-size: 13px;
      color: #6b7280;
      text-align: center;
      padding: 25px 20px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .footer a {
      color: #2563eb;
      font-weight: 600;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .email-wrapper {
        margin: 10px;
      }
      .content {
        padding: 20px;
      }
      .post-content {
        padding: 16px;
      }
      .post-title {
        font-size: 18px;
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
      <p>Here’s your fresh batch of handpicked posts to kickstart your day:</p>

      {{#each posts}}
      <div class="post">
        {{#if this.thumbnail}}
          <img src="{{this.thumbnail}}" alt="{{this.title}}" />
        {{/if}}

        <div class="post-content">
          <a href="https://inksha.onrender.com/post/{{this.slug}}" class="post-title">{{this.title}}</a>

              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 12px;">
                 <tr>
                {{#if this.author.avatar}}
                <td style="vertical-align: middle; padding-right: 8px;">
                  <img src="{{this.author.avatar}}" alt="{{this.author.name}}" width="28" height="28" style="border-radius: 50%; display: block;" />
                </td>
                {{/if}}
                <td style="vertical-align: middle; font-size: 14px; color: #6b7280;">
                  by {{this.author.name}}
                </td>
              </tr>
              </table>


            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin: 12px 0;">
              <tr>
                <td width="16.6%" align="center" valign="middle" style="font-size: 8px; line-height: 1.2; font-weight: normal; color: #374151;">
                  📖
                </td>
                <td width="16.6%" align="left" valign="middle" style="font-size: 10px; font-weight: bold; color: #374151;">
                  {{#if this.readTime}}{{this.readTime}}{{else}}0 min{{/if}}
                </td>
                <td width="16.6%" align="center" valign="middle" style="font-size: 8px; line-height: 1.2; font-weight: normal; color: #374151;">
                  ❤️
                </td>
                <td width="16.6%" align="left" valign="middle" style="font-size: 10px; font-weight: bold; color: #374151;">
                  {{#if this.likesCount}}{{this.likesCount}}{{else}}0{{/if}}
                </td>
                <td width="16.6%" align="center" valign="middle" style="font-size: 8px; line-height: 1.2; font-weight: normal; color: #374151;">
                  💬
                </td>
                <td width="16.6%" align="left" valign="middle" style="font-size: 10px; font-weight: bold; color: #374151;">
                  {{#if this.commentsCount}}{{this.commentsCount}}{{else}}0{{/if}}
                </td>
              </tr>
            </table>






          <a href="https://inksha.onrender.com/post/{{this.slug}}" class="read-more">Read More</a>
        </div>
      </div>
      {{/each}}

      {{#unless posts.length}}
      <p>No new posts today — check out more at <a href="https://inksha.onrender.com">Inksha</a>.</p>
      {{/unless}}

      {{#if hasButton}}
      <div class="button-wrapper">
        <a href="{{buttonUrl}}" class="button">{{buttonText}}</a>
      </div>
      {{/if}}
    </div>

    <div class="footer">
      You received this email as part of your Inksha subscription.<br />
      Need help? Contact <a href="mailto:{{supportEmail}}">support</a>.
    </div>
  </div>
</body>
</html>`;
