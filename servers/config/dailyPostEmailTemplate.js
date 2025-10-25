// config/dailyPostEmailTemplate.js

export const DAILY_POST_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{subject}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin:0;
      padding:0;
      background-color:#f3f4f6;
      font-family:'Inter',sans-serif;
      color:#111827;
    }
    .wrapper {
      width:100%;
      max-width:700px;
      margin:30px auto;
      background-color:#fff;
      border-radius:12px;
      border:1px solid #e5e7eb;
      overflow:hidden;
    }
    .post-card {
      border:1px solid #e5e7eb;
      border-radius:10px;
      overflow:hidden;
      margin-bottom:20px;
    }
    .featured {
      box-shadow:0 4px 12px rgba(0,0,0,0.08);
    }
    .featured-title {
      font-size:22px;
      font-weight:700;
      margin-bottom:10px;
      color:#1d4ed8;
      text-decoration:none;
      display:block;
    }
    .compact-title {
      font-size:18px;
      font-weight:600;
      margin-bottom:6px;
      color:#1d4ed8;
      text-decoration:none;
      display:block;
    }
    .no-posts-section {
      padding:40px 25px;
      text-align:center;
      background-color:#fefce8;
      border-radius:8px;
      margin:0 25px 20px 25px;
    }
    @media only screen and (max-width:620px) {
      body, table, td, p, a {
        font-size:16px !important;
      }
      .featured-title { font-size:20px !important; }
      .compact-title { font-size:16px !important; }
    }
  </style>
</head>
<body>
  <!-- Hidden preview text -->
  <span style="display:none; visibility:hidden; opacity:0; max-height:0; overflow:hidden;">
    {{#if noPosts}}No new posts today, but explore more at Readzio!{{else}}{{#if posts.[0].excerpt}}{{posts.[0].excerpt}}{{else}}Your daily dose of fresh posts.{{/if}}{{/if}}
  </span>

  <center>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
      <tr>
        <td align="center">
          <table class="wrapper" role="presentation" cellpadding="0" cellspacing="0">
            <!-- Header -->
            <tr>
              <td style="padding:20px; background:linear-gradient(135deg,#e0f2fe,#f0f9ff); text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td style="padding-right:10px;">
                      <img src="https://readzio.com/logo.png" alt="readzio Logo" width="40" height="40" style="border-radius:50%;">
                    </td>
                    <td style="font-size:20px; font-weight:bold; color:#111827;">readzio</td>
                  </tr>
                </table>
                <h1 style="margin-top:15px; font-size:24px; font-weight:700; color:#0f172a;">{{subject}}</h1>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding:25px 25px 10px 25px; font-size:16px; line-height:1.6; color:#374151;">
                <p style="margin:0 0 16px;">Hi {{name}},</p>
                {{#if noPosts}}
                <p style="margin:0 0 20px;">No new posts were published in the last 24 hours, but there's still plenty to explore on Readzio!</p>
                {{else}}
                <p style="margin:0 0 20px;">Here's your daily curated list of {{posts.length}} top post{{#if posts.[1]}}s{{/if}} — starting with today's highlight:</p>
                {{/if}}
              </td>
            </tr>

            {{#if noPosts}}
            <!-- No Posts Fallback Section -->
            <tr>
              <td>
                <div class="no-posts-section">
                  <h2 style="margin:0 0 15px; font-size:20px; font-weight:700; color:#92400e;">📚 No New Posts Today</h2>
                  <p style="margin:0 0 20px; font-size:15px; color:#78350f; line-height:1.6;">
                    We're working on bringing you fresh content! In the meantime, explore our archive of amazing stories and articles.
                  </p>
                  <a href="https://readzio.com/explore" style="display:inline-block; background:#eab308; color:#fff; padding:12px 24px; font-size:15px; font-weight:600; text-decoration:none; border-radius:8px;">
                    Explore Archive
                  </a>
                </div>
              </td>
            </tr>
            {{else}}
            <!-- Featured Post -->
            {{#if posts.[0]}}
            <tr>
              <td style="padding:0 25px 20px 25px;">
                <table class="post-card featured" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  {{#if posts.[0].thumbnail}}
                  <tr>
                    <td>
                      <img src="{{posts.[0].thumbnail}}" alt="{{posts.[0].title}}" width="100%" style="display:block; max-height:300px; object-fit:cover;">
                    </td>
                  </tr>
                  {{/if}}
                  <tr>
                    <td style="padding:20px;">
                      <a href="https://readzio.com/post/{{posts.[0].slug}}" class="featured-title">{{posts.[0].title}}</a>
                      <div style="font-size:14px; color:#6b7280; margin-bottom:10px;">
                        by {{posts.[0].author.name}} {{#if posts.[0].readTime}}&bull; {{posts.[0].readTime}}{{/if}}
                      </div>
                      {{#if posts.[0].excerpt}}
                      <p style="font-size:15px; color:#374151; margin-bottom:12px;">{{posts.[0].excerpt}}</p>
                      {{/if}}
                      <a href="https://readzio.com/post/{{posts.[0].slug}}" style="display:inline-block; font-size:14px; font-weight:600; color:#10b981; border:1px solid #10b981; padding:8px 16px; border-radius:6px; text-decoration:none;">Read More</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            {{/if}}

            <!-- Other Posts -->
            {{#each posts}}
              {{#unless @first}}
              <tr>
                <td style="padding:0 25px 15px 25px;">
                  <table class="post-card" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      {{#if this.thumbnail}}
                      <td style="width:120px; vertical-align:top;">
                        <img src="{{this.thumbnail}}" alt="{{this.title}}" width="120" height="80" style="display:block; object-fit:cover; border-radius:8px 0 0 8px;">
                      </td>
                      {{/if}}
                      <td style="padding:15px; vertical-align:top;">
                        <a href="https://readzio.com/post/{{this.slug}}" class="compact-title">{{this.title}}</a>
                        <div style="font-size:13px; color:#6b7280; margin-bottom:6px;">
                          by {{this.author.name}} {{#if this.readTime}}&bull; {{this.readTime}}{{/if}}
                        </div>
                        {{#if this.excerpt}}
                        <p style="font-size:14px; color:#6b7280; margin:0; line-height:1.4;">{{this.excerpt}}</p>
                        {{/if}}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              {{/unless}}
            {{/each}}
            {{/if}}

            <!-- CTA -->
            {{#if hasButton}}
            <tr>
              <td align="center" style="padding:30px;">
                <a href="{{buttonUrl}}" style="background:linear-gradient(to right,#3b82f6,#2563eb); color:#fff; padding:14px 28px; font-size:15px; font-weight:600; text-decoration:none; border-radius:8px; display:inline-block;">
                  {{buttonText}}
                </a>
              </td>
            </tr>
            {{/if}}

            <!-- Footer -->
            <tr>
              <td style="background-color:#f9fafb; padding:20px; font-size:13px; color:#6b7280; text-align:center; border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 10px;">You received this email as part of your readzio subscription.</p>
                <p style="margin:0 0 10px;">Need help? Contact <a href="mailto:{{supportEmail}}" style="color:#2563eb; font-weight:600; text-decoration:none;">support</a>.</p>
                <p style="margin:0; font-size:12px; color:#9ca3af;">
                  <a href="https://readzio.com/unsubscribe" style="color:#6b7280; text-decoration:none;">Unsubscribe</a> | 
                  <a href="https://readzio.com/preferences" style="color:#6b7280; text-decoration:none;">Email Preferences</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
