import { Y_LOGO_URL, Y_LOGO_HOST_URL } from '../constants/variables';

export function generateOtpEmailHtml(
    title: string,
    description: string,
    otp: string,
    subtitle: string,
    subtitle_description: string,
    username: string
) {
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
                  <a href=${Y_LOGO_HOST_URL}>
                    <img src=${Y_LOGO_URL} alt="Yapper" style="width: 40px; height: 40px; filter: brightness(0) invert(1);" />
                  </a>
                </div>
              </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
              <td style="padding: 32px 48px 24px 48px;">
                <h1 style="color: #0f1419; font-size: 32px; font-weight: 800; line-height: 36px; margin: 0 0 24px 0; letter-spacing: -0.5px;">
                  ${title}
                </h1>
                
                <p style="color: #536471; font-size: 16px; line-height: 20px; margin: 0 0 32px 0;">
                  ${description}
                </p>
                
                <!-- OTP Code -->
                <div style="background-color: #f7f9fa; border: 1px solid #e1e8ed; border-radius: 8px; padding: 24px; margin: 32px 0; text-align: center;">
                  <div style="color: #0f1419; font-size: 28px; font-weight: 700; letter-spacing: 8px; font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;">
                    ${otp}
                  </div>
                </div>
                
                <h2 style="color: #0f1419; font-size: 20px; font-weight: 700; line-height: 24px; margin: 40px 0 12px 0;">
                  ${subtitle}
                </h2>
                
                <p style="color: #536471; font-size: 16px; line-height: 20px; margin: 0 0 40px 0;">
                    ${subtitle_description}
                </p>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 32px 48px 40px 48px; text-align: center; border-top: 1px solid #e1e8ed;">
                
                <p style="color: #8b98a5; font-size: 13px; line-height: 16px; margin: 0 0 8px 0;">
                  This email was meant for @${username}
                </p>
                
                <p style="color: #8b98a5; font-size: 13px; line-height: 16px; margin: 0 0 12px 0;">
                  Yapper Corp. Cairo Uni Street, Engineering faculty, Giza, Egypt (mabna "3" el dor el sab3)
                </p>

                <p style="color: #8b98a5; font-size: 12px; line-height: 16px; margin: 0; font-weight: 600;">
                  The code is valid for 1 hour.
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
