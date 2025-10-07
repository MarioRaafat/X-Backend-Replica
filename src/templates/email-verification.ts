export function getVerificationEmailTemplate({ first_name, otp, not_me_link }) {
    return `
   <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>El Sab3 - Account Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #ddd;">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0 0 15px;">Hi${first_name ? ' ' + first_name : ''},</p>
            <p style="margin: 0 0 15px;">
              You may verify your El Sab3 account using the following OTP: <br />
              <span style="font-size: 24px; font-weight: 700;">${otp}</span>
            </p>
            <p style="margin: 36px 0;">
              <a href="${not_me_link}" style="background-color: #4287f5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">It's not me</a>
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 10px 0;">
                  <div style="display: inline-block; background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; border-radius: 5px; font-size: 14px; color: #856404; margin-left: 20px; margin-right: 20px;">
                    <span style="font-size: 16px; vertical-align: middle;">⚠️</span>
                    <span style="vertical-align: middle;">The account is automatically deleted in 1 hour if not verified.</span>
                  </div>
                </td>
              </tr>
            </table>
            <p style="margin: 20px 0 0; font-size: 14px;">
              Regards,<br />
              El Sab3
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
