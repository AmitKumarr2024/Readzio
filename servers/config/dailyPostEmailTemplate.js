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
    {{#if posts.[0].excerpt}}{{posts.[0].excerpt}}{{else}}Your daily dose of fresh posts.{{/if}}
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
                      <img src="https://readzio.com/public/logo1.png" alt="inkshaa Logo" width="40" height="40" style="border-radius:50%;">
                    </td>
                    <td style="font-size:20px; font-weight:bold; color:#111827;">inkshaa</td>
                  </tr>
                </table>
                <h1 style="margin-top:15px; font-size:24px; font-weight:700; color:#0f172a;">{{subject}}</h1>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding:25px 25px 10px 25px; font-size:16px; line-height:1.6; color:#374151;">
                <p style="margin:0 0 16px;">Hi {{name}},</p>
                <p style="margin:0 0 20px;">Here’s your daily curated list of top posts — starting with today’s highlight:</p>
              </td>
            </tr>

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
                      <td style="width:120px;">
                        <img src="{{this.thumbnail}}" alt="{{this.title}}" width="120" height="80" style="display:block; object-fit:cover;">
                      </td>
                      {{/if}}
                      <td style="padding:10px;">
                        <a href="https://readzio.com/post/{{this.slug}}" class="compact-title">{{this.title}}</a>
                        <div style="font-size:13px; color:#6b7280; margin-bottom:6px;">
                          by {{this.author.name}} {{#if this.readTime}}&bull; {{this.readTime}}{{/if}}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              {{/unless}}
            {{/each}}

            <!-- No Posts Fallback -->
            {{#unless posts.length}}
            <tr>
              <td style="padding:25px; font-size:14px; color:#6b7280; text-align:center;">
                No new posts today — explore more at <a href="https://readzio.com" style="color:#2563eb; font-weight:600; text-decoration:none;">inkshaa</a>.
              </td>
            </tr>
            {{/unless}}

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
                You received this email as part of your inkshaa subscription.<br>
                Need help? Contact <a href="mailto:{{supportEmail}}" style="color:#2563eb; font-weight:600; text-decoration:none;">support</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
