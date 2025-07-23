export const DAILY_POST_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>{{subject}}</title>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet" type="text/css">
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: 'Poppins', sans-serif;
      background: #F4F7FA;
      color: #333333;
    }
    table, td {
      border-collapse: collapse;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 40px auto;
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #6B46C1 0%, #4F46E5 100%);
      padding: 20px;
      text-align: center;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
    .header img {
      max-width: 150px;
      height: auto;
    }
    .main-content {
      padding: 30px;
    }
    .post-item {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #E5E7EB;
    }
    .post-item:last-child {
      border-bottom: none;
    }
    .post-title {
      font-size: 18px;
      font-weight: 600;
      color: #4F46E5;
      margin: 0 0 8px;
      text-decoration: none;
    }
    .post-author {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 8px;
    }
    .post-thumbnail {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .post-link {
      font-size: 14px;
      color: #4F46E5;
      text-decoration: none;
    }
    .post-link:hover {
      text-decoration: underline;
    }
    .button {
      display: inline-block;
      background: #22D172;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      text-align: center;
      transition: background 0.3s ease;
    }
    .button:hover {
      background: #1EBB5E;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
      border-top: 1px solid #E5E7EB;
      background: #F9FAFB;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
    }
    .footer img {
      max-width: 30px;
      vertical-align: middle;
      margin-right: 5px;
    }
    @media only screen and (max-width: 480px) {
      .container {
        width: 90% !important;
      }
      .post-title {
        font-size: 16px;
      }
      .post-author, .post-link {
        font-size: 12px;
      }
      .button {
        width: 100%;
        box-sizing: border-box;
      }
    }
  </style>
</head>
<body>
  <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="#F4F7FA">
    <tbody>
      <tr>
        <td valign="top" align="center">
          <table class="container" width="600" cellspacing="0" cellpadding="0" border="0">
            <tbody>
              <tr>
                <td class="header">
                  <img src="https://via.placeholder.com/150x50/6B46C1/FFFFFF?text=Mount+Amit" alt="Mount Amit Logo">
                  <h1 style="margin: 10px 0; font-size: 24px; color: #FFFFFF;">{{subject}}</h1>
                </td>
              </tr>
              <tr>
                <td class="main-content">
                  <table width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                      <tr>
                        <td style="padding: 0 0 16px; font-size: 16px; line-height: 150%;">
                          Dear {{name}},
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px; font-size: 14px; line-height: 150%;">
                          Here are today's top posts:
                        </td>
                      </tr>
                      {{#each posts}}
                      <tr class="post-item">
                        <td>
                          <a href="https://inksha.onrender.com/post/{{this.slug}}" class="post-title">{{this.title}}</a>
                          <p class="post-author">by {{this.author.name}}</p>
                          {{#if this.thumbnail}}
                          <img src="{{this.thumbnail}}" alt="{{this.title}} thumbnail" class="post-thumbnail">
                          {{/if}}
                          <a href="https://inksha.onrender.com/post/{{this.slug}}" class="post-link">Read more</a>
                        </td>
                      </tr>
                      {{else}}
                      <tr>
                        <td style="padding: 0 0 16px; font-size: 14px; line-height: 150%;">
                          No new posts today. Check out our platform for more content!
                        </td>
                      </tr>
                      {{/each}}
                      {{#if hasButton}}
                      <tr>
                        <td style="padding: 0 0 24px;">
                          <a href="{{buttonUrl}}" class="button">{{buttonText}}</a>
                        </td>
                      </tr>
                      {{/if}}
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <img src="https://via.placeholder.com/30/6B46C1/FFFFFF?text=MA" alt="Mount Amit Icon">
                  Best regards,<br>Inksha Official<br>
                  <a href="mailto:{{supportEmail}}" style="color: #4F46E5; text-decoration: none;">Contact Support</a>
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