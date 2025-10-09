import { X_LOGO_URL } from '../constants/variables';

export function getPasswordResetEmailTemplate({ otp, user_name }: { otp: string; user_name: string }) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password?</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #0f1419;
      margin: 0;
      padding: 0;
      background-color: #f7f9fa;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  </style>
</head>
<body>
  <div class="email-container">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
      <tr>
        <td style="padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <!-- Header with Yapper logo -->
            <tr>
              <td style="padding: 32px 48px 0 48px; text-align: right;">
                <div style="width: 40px; height: 40px; background-color: #000000; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
                  <img src="${X_LOGO_URL}" alt="Yapper" style="width: 40px; height: 40px; filter: brightness(0) invert(1);" />
                </div>
              </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
              <td style="padding: 32px 48px 24px 48px;">
                <h1 style="color: #0f1419; font-size: 32px; font-weight: 800; line-height: 36px; margin: 0 0 24px 0; letter-spacing: -0.5px;">
                  Reset your password?
                </h1>
                
                <p style="color: #536471; font-size: 16px; line-height: 20px; margin: 0 0 32px 0;">
                  If you requested a password reset for @${user_name}, use the confirmation code below to complete the process. If you didn't make this request, ignore this email.
                </p>
                
                <!-- OTP Code -->
                <div style="background-color: #f7f9fa; border: 1px solid #e1e8ed; border-radius: 8px; padding: 24px; margin: 32px 0; text-align: center;">
                  <div style="color: #0f1419; font-size: 28px; font-weight: 700; letter-spacing: 8px; font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;">
                    ${otp}
                  </div>
                </div>
                
                <h2 style="color: #0f1419; font-size: 20px; font-weight: 700; line-height: 24px; margin: 40px 0 12px 0;">
                  Getting a lot of password reset emails?
                </h2>
                
                <p style="color: #536471; font-size: 16px; line-height: 20px; margin: 0 0 40px 0;">
                  You can change your 
                  <a href="#" style="color: #1d9bf0; text-decoration: none;">account settings</a> 
                  to require personal information to reset your password.
                </p>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 32px 48px 40px 48px; text-align: center; border-top: 1px solid #e1e8ed;">
                <p style="color: #536471; font-size: 13px; line-height: 16px; margin: 0 0 16px 0;">
                  <a href="#" style="color: #1d9bf0; text-decoration: none; margin: 0 8px;">Help</a>
                  <span style="color: #cfd9de; margin: 0 4px;">|</span>
                  <a href="#" style="color: #1d9bf0; text-decoration: none; margin: 0 8px;">Not my account</a>
                  <span style="color: #cfd9de; margin: 0 4px;">|</span>
                  <a href="#" style="color: #1d9bf0; text-decoration: none; margin: 0 8px;">Email security tips</a>
                </p>
                
                <p style="color: #8b98a5; font-size: 13px; line-height: 16px; margin: 0 0 8px 0;">
                  This email was meant for @${user_name}
                </p>
                
                <p style="color: #8b98a5; font-size: 13px; line-height: 16px; margin: 0;">
                  X Corp. 1355 Market Street, Suite 900 San Francisco, CA 94103
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}