export const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>{{subject}}</title>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet" type="text/css">
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: 'Lato', sans-serif;
      background: #ffffff;
      color: #000000;
    }
    table, td {
      border-collapse: collapse;
    }
    .container {
      width: 100%;
      max-width: 650px;
      margin: 40px auto;
      background: #ffffff;
      border: 1px solid #000000;
      border-radius: 0;
    }
    .header {
      padding: 25px;
      text-align: center;
      border-bottom: 1px solid #000000;
    }
    .header img {
      max-width: 160px;
      height: auto;
    }
    .main-content {
      padding: 35px;
    }
    .otp-box {
      border: 2px dashed #000000;
      border-radius: 0;
      padding: 20px;
      text-align: center;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 4px;
      margin: 25px 0;
    }
    .button {
      display: inline-block;
      background: #000000;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 700;
      border-radius: 0;
      text-align: center;
    }
    .footer {
      padding: 25px;
      text-align: center;
      font-size: 13px;
      color: #000000;
      border-top: 1px solid #000000;
    }
    .footer img {
      max-width: 35px;
      vertical-align: middle;
      margin-right: 6px;
    }
    @media only screen and (max-width: 480px) {
      .container {
        width: 90% !important;
      }
      .otp-box {
        font-size: 22px;
      }
      .button {
        width: 100%;
        box-sizing: border-box;
      }
    }
  </style>
</head>
<body>
  <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="#ffffff">
    <tbody>
      <tr>
        <td valign="top" align="center">
          <table class="container" width="600" cellspacing="0" cellpadding="0" border="0">
            <tbody>
              <tr>
                <td class="header">
                 <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display: inline-flex; align-items: center;  justify-content: center; padding-top: 10px;">
                <tr>
                  <td style="padding-right: 10px;">
                    <img src="https://inkshaa.onrender.com/public/logo1.png" alt="inkshaa Logo" width="40" height="40" style="border-radius: 50%; object-fit: cover;" />
                  </td>
                  <td>
                    <span style="font-size: 20px; font-weight: bold; color: #111827; font-family: sans-serif;">inkshaa</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
                  <h1 style="margin: 12px 0; font-size: 26px;">{{subject}}</h1>
                </td>
              </tr>
              <tr>
                <td class="main-content">
                  <table width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                      <tr>
                        <td style="padding: 0 0 18px; font-size: 16px; line-height: 150%;">
                          Dear {{name}},
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 18px; font-size: 15px; line-height: 150%;">
                          {{message}}
                        </td>
                      </tr>
                      {{#if otp}}
                      <tr>
                        <td style="padding: 0 0 18px; font-size: 15px; line-height: 150%;">
                          Your One-Time Password (OTP) is:
                        </td>
                      </tr>
                      <tr>
                        <td class="otp-box">
                          {{otp}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 18px; font-size: 15px; line-height: 150%;">
                          This OTP is valid for {{#if isResetOtp}}15 minutes{{else}}1 hour{{/if}}. Please keep it confidential.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 24px; font-size: 15px; line-height: 150%;">
                          If this request was not initiated by you, please contact our support team immediately.
                        </td>
                      </tr>
                      {{/if}}
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
                 <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display: inline-flex; align-items: center;  justify-content: center; padding-top: 10px;">
                <tr>
                  <td style="padding-right: 10px;">
                    <img src="https://inkshaa.onrender.com/public/logo1.png" alt="inkshaa Logo" width="40" height="40" style="border-radius: 50%; object-fit: cover;" />
                  </td>
                  <td>
                    <span style="font-size: 20px; font-weight: bold; color: #111827; font-family: sans-serif;">inkshaa</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
                  Best regards,<br>inkshaa Team<br>
                  <a href="mailto:{{supportEmail}}" style="color: #000000; text-decoration: none;">Contact Support</a>
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

export const INVOICE_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: 'Lato', sans-serif; padding: 30px; background: #f7f7f7; margin: 0; }
      h2 { color: #1a73e8; font-size: 24px; font-weight: 700; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 25px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; }
      th, td { border: 1px solid #e0e0e0; padding: 12px; text-align: left; font-size: 15px; }
      th { background: #f9fafb; color: #555555; }
      p { font-size: 15px; color: #757575; line-height: 150%; }
    </style>
  </head>
  <body>
    <div style="max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="padding: 30px;">
        <h2>Invoice Receipt</h2>
        <p>Dear {{name}},</p>
        <p>Thank you for your payment. Please find your invoice details below:</p>

        <table>
          <tr><th>Invoice ID</th><td>{{invoice.invoiceId}}</td></tr>
          <tr><th>Order ID</th><td>{{invoice.orderId}}</td></tr>
          <tr><th>Payment ID</th><td>{{invoice.paymentId}}</td></tr>
          <tr><th>Amount</th><td>₹ {{invoice.amount}}</td></tr>
          <tr><th>Currency</th><td>{{invoice.currency}}</td></tr>
          <tr><th>Date</th><td>{{invoice.date}}</td></tr>
        </table>

        <p>For any inquiries, please contact our support team.</p>
        <p>— inkshaa Team</p>
      </div>
    </div>
  </body>
</html>`;

export const WELCOME_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en" style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <head>
    <meta charset="UTF-8" />
    <title>{{subject}}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .content { padding: 16px !important; }
        .header-img { width: 60px !important; height: 60px !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #e0e7ff 0%, #f0f4f8 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
      <tr>
        <td align="center">
          <table class="container" cellpadding="0" cellspacing="0" width="640" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display: inline-flex; align-items: center;  justify-content: center; padding-top: 10px;">
                <tr>
                  <td style="padding-right: 10px;">
                    <img src="https://inkshaa.onrender.com/public/logo1.png" alt="inkshaa Logo" width="40" height="40" style="border-radius: 50%; object-fit: cover;" />
                  </td>
                  <td>
                    <span style="font-size: 20px; font-weight: bold; color: #111827; font-family: sans-serif;">inkshaa</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
                <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to inkshaa, {{name}}!</h1>
                <p style="color: #e0e7ff; font-size: 16px; margin: 12px 0 0; line-height: 1.5;">{{message}}</p>
              </td>
            </tr>
            <tr>
              <td class="content" style="padding: 32px; text-align: center;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">We're thrilled to have you on board! Explore our platform, connect with our community, and unleash your creativity.</p>
                
                {{#if hasButton}}
                <a href="{{buttonUrl}}" style="display: inline-block; margin: 20px 0; background: linear-gradient(90deg, #2563eb, #4f46e5); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s;">
                  {{buttonText}}
                </a>
                {{/if}}

                
              </td>
            </tr>
            <tr>
              <td style="background-color: #f3f4f6; text-align: center; padding: 16px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                Need help? Contact us at <a href="mailto:{{supportEmail}}" style="color: #4f46e5; text-decoration: none;">{{supportEmail}}</a>.<br />
                
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
