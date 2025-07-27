export const DAILY_POST_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{subject}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width: 620px) {
      body, table, td, p, a {
        font-size: 16px !important;
      }
      .wrapper {
        width: 100% !important;
        padding: 0 10px !important;
      }
      .button {
        padding: 12px 20px !important;
        font-size: 16px !important;
      }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:'Inter', sans-serif; color:#111827;">
  <center>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f4f6;">
      <tr>
        <td align="center">
          <table class="wrapper" width="700" cellpadding="0" cellspacing="0" role="presentation" style="width:100%; max-width:700px; margin:30px auto; background-color:#ffffff; border-radius:12px; border:1px solid #e5e7eb; box-shadow:0 6px 20px rgba(0,0,0,0.05);">
            <!-- Header -->
            <tr>
              <td align="center" style="padding:30px 20px; background:linear-gradient(135deg, #e0f2fe, #f0f9ff);">
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="padding-right:10px;">
                      <img src="https://inksha-uedq.onrender.com/public/logo1.png" alt="Inksha Logo" width="40" height="40" style="border-radius:50%; display:block;">
                    </td>
                    <td style="font-size:20px; font-weight:bold; color:#111827;">Inksha</td>
                  </tr>
                </table>
                <h1 style="margin-top:20px; font-size:24px; font-weight:700; color:#0f172a;">{{subject}}</h1>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding:30px 30px 10px 30px; font-size:16px; line-height:1.6; color:#374151;">
                <p style="margin:0 0 16px;">Hi {{name}},</p>
                <p style="margin:0 0 20px;">Here’s your fresh batch of handpicked posts to kickstart your day:</p>
              </td>
            </tr>

            <!-- Posts -->
            {{#each posts}}
            <tr>
              <td style="padding:0 30px 30px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
                  {{#if this.thumbnail}}
                  <tr>
                    <td>
                      <img src="{{this.thumbnail}}" alt="{{this.title}}" width="100%" style="display:block; max-height:240px; object-fit:cover;">
                    </td>
                  </tr>
                  {{/if}}
                  <tr>
                    <td style="padding:20px;">
                      <a href="https://inksha-uedq.onrender.com/post/{{this.slug}}" style="display:block; font-size:20px; font-weight:700; color:#1d4ed8; text-decoration:none; margin-bottom:10px;">{{this.title}}</a>

                      <!-- Author -->
                      <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:10px;">
                        <tr>
                          {{#if this.author.avatar}}
                          <td style="padding-right:8px;">
                            <img src="{{this.author.avatar}}" alt="{{this.author.name}}" width="24" height="24" style="border-radius:50%; object-fit:cover; display:block;">
                          </td>
                          {{/if}}
                          <td style="font-size:14px; color:#6b7280;">by {{this.author.name}}</td>
                        </tr>
                      </table>

                      <!-- Post Meta -->
                      <table cellpadding="0" cellspacing="0" role="presentation" style="font-size:13px; color:#6b7280; margin-bottom:15px;">
                        <tr>
                          <td style="padding-right:16px;">📖 {{#if this.readTime}}{{this.readTime}}{{else}}0 min{{/if}}</td>
                          <td style="padding-right:16px;">👍 {{#if this.likesCount}}{{this.likesCount}}{{else}}0{{/if}}</td>
                          <td>💬 {{#if this.commentsCount}}{{this.commentsCount}}{{else}}0{{/if}}</td>
                        </tr>
                      </table>

                      <!-- Read More -->
                      <a href="https://inksha-uedq.onrender.com/post/{{this.slug}}" style="display:inline-block; font-size:14px; font-weight:600; color:#10b981; border:1px solid #10b981; padding:8px 16px; border-radius:6px; text-decoration:none;">Read More</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            {{/each}}

            <!-- No Posts Fallback -->
            {{#unless posts.length}}
            <tr>
              <td style="padding:30px; font-size:14px; color:#6b7280;">
                No new posts today — check out more at <a href="https://inksha-uedq.onrender.com" style="color:#2563eb; font-weight:600; text-decoration:none;">Inksha</a>.
              </td>
            </tr>
            {{/unless}}

            <!-- CTA Button -->
            {{#if hasButton}}
            <tr>
              <td align="center" style="padding:30px;">
                <a class="button" href="{{buttonUrl}}" style="background:linear-gradient(to right, #3b82f6, #2563eb); color:#ffffff; padding:14px 28px; font-size:15px; font-weight:600; text-decoration:none; border-radius:8px; display:inline-block;">{{buttonText}}</a>
              </td>
            </tr>
            {{/if}}

            <!-- Footer -->
            <tr>
              <td style="background-color:#f9fafb; padding:25px 20px; font-size:13px; color:#6b7280; text-align:center; border-top:1px solid #e5e7eb;">
                You received this email as part of your Inksha subscription.<br />
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
