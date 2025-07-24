export const EMAIL_TEMPLATE = `<!DOCTYPE html>
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
    .otp-box {
      background: #F9FAFB;
      border: 2px dashed #6B46C1;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: 3px;
      color: #4F46E5;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
      .otp-box {
        font-size: 20px;
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
                  <img src="https://inksha.onrender.com/public/logo.png
" alt="Mount Amit Logo">
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
                          {{message}}
                        </td>
                      </tr>
                      {{#if otp}}
                      <tr>
                        <td style="padding: 0 0 16px; font-size: 14px; line-height: 150%;">
                          Your One-Time Password (OTP) is:
                        </td>
                      </tr>
                      <tr>
                        <td class="otp-box">
                          {{otp}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px; font-size: 14px; line-height: 150%;">
                          This OTP is valid for {{#if isResetOtp}}15 minutes{{else}}1 hour{{/if}}. Please do not share it with anyone.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px; font-size: 14px; line-height: 150%;">
                          If you did not request this OTP, please contact support.
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
                  <img src="https://inksha.onrender.com/public/logo.png
" alt="Mount Amit Icon">
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

export const INVOICE_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial; padding: 20px; }
      h2 { color: #333; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
    </style>
  </head>
  <body>
    <h2>Invoice Receipt</h2>
    <p>Hi {{name}},</p>
    <p>Thanks for your payment. Here's your invoice:</p>

    <table>
      <tr><th>Invoice ID</th><td>{{invoice.invoiceId}}</td></tr>
      <tr><th>Order ID</th><td>{{invoice.orderId}}</td></tr>
      <tr><th>Payment ID</th><td>{{invoice.paymentId}}</td></tr>
      <tr><th>Amount</th><td>₹ {{invoice.amount}}</td></tr>
      <tr><th>Currency</th><td>{{invoice.currency}}</td></tr>
      <tr><th>Date</th><td>{{invoice.date}}</td></tr>
    </table>

    <p>If you have any questions, feel free to contact us.</p>
    <p>— The Inksha Team</p>
  </body>
</html>
`;
