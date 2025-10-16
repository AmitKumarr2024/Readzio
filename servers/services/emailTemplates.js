// services/emailTemplates.js

export const verificationOtpTemplate = (otp, name) => `
  <div style="font-family:Arial,sans-serif;">
    <h2>Hi ${name || "User"},</h2>
    <p>Your verification OTP is:</p>
    <h1 style="color:#2e86de;">${otp}</h1>
    <p>This code is valid for 1 hour. Don’t share it with anyone.</p>
    <p>— Team Readzio</p>
  </div>
`;

export const resetOtpTemplate = (otp, name) => `
  <div style="font-family:Arial,sans-serif;">
    <h2>Password Reset OTP</h2>
    <p>Hello ${name || "User"},</p>
    <p>Your OTP for password reset is:</p>
    <h1 style="color:#e74c3c;">${otp}</h1>
    <p>This code expires in 15 minutes.</p>
    <p>— Team Readzio</p>
  </div>
`;

export const welcomeTemplate = (name) =>
  `<!DOCTYPE html>
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
                    <img src="https://readzio.com/logo.png" alt="readzio Logo" width="40" height="40" style="border-radius: 50%; object-fit: cover;" />
                  </td>
                  <td>
                    <span style="font-size: 20px; font-weight: bold; color: #111827; font-family: sans-serif;">readzio</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
                <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to readzio, {{name}}!</h1>
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
</html>
`;
