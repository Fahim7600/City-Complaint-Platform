export interface StaffInviteParams {
  name: string;
  role: string;
  departmentName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

export interface PasswordChangedParams {
  name: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Escapes HTML characters to prevent XSS in email clients.
 */
export const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Template for inviting a staff member (Technician or Manager).
 * Uses teal (#03604c) and violet (#a855f7) branding.
 */
export const staffInvite = (params: StaffInviteParams): EmailContent => {
  const safeName = escapeHtml(params.name);
  const safeRole = escapeHtml(params.role);
  const safeDept = escapeHtml(params.departmentName);
  const safeEmail = escapeHtml(params.email);
  const safePass = escapeHtml(params.tempPassword);
  const safeLoginUrl = escapeHtml(params.loginUrl);

  const subject = `You've been invited to CityFix as a ${params.role}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #03604c 0%, #a855f7 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: #f1f5f9; margin: 8px 0 0; font-size: 15px; opacity: 0.95; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 15px; }
    .greeting { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .badge { display: inline-block; background-color: #f1f5f9; border-left: 4px solid #03604c; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 15px; color: #334155; }
    .credentials-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .field-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px; }
    .field-val { font-size: 15px; color: #0f172a; margin-bottom: 12px; font-weight: 500; }
    .password-val { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 18px; color: #03604c; background: #ffffff; border: 1px dashed #cbd5e1; padding: 10px 14px; border-radius: 6px; display: inline-block; letter-spacing: 1.5px; font-weight: 700; }
    .notice { font-size: 13px; color: #64748b; background-color: #fefce8; border: 1px solid #fef08a; padding: 12px 14px; border-radius: 6px; margin: 18px 0; }
    .btn-container { text-align: center; margin: 28px 0 20px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #03604c 0%, #047857 100%); color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(3, 96, 76, 0.2); }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CityFix</h1>
      <p>Municipal Service Request &amp; Complaint Management</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${safeName},</div>
      <p>You have been added to <strong>${safeDept}</strong> as a <strong>${safeRole}</strong> on the CityFix civic operations platform.</p>
      
      <div class="credentials-box">
        <div class="field-label">Login Email:</div>
        <div class="field-val">${safeEmail}</div>
        <div class="field-label">Temporary Password:</div>
        <div class="password-val">${safePass}</div>
      </div>

      <div class="notice">
        <strong>Important:</strong> You must set a new personal password upon your first sign-in. This temporary password expires in <strong>7 days</strong>.
      </div>

      <div class="btn-container">
        <a href="${safeLoginUrl}" class="btn" target="_blank" rel="noopener noreferrer">Sign in to CityFix</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        If you have trouble clicking the button, copy and paste this URL into your browser:<br>
        <span style="color: #03604c; word-break: break-all;">${safeLoginUrl}</span>
      </p>
    </div>
    <div class="footer">
      This is an automated system invitation from CityFix. If you were not expecting this, please notify your administrator.
    </div>
  </div>
</body>
</html>`;

  const text = `Hello ${params.name},

You have been added to ${params.departmentName} as a ${params.role} on CityFix.

Your login credentials:
Email: ${params.email}
Temporary Password: ${params.tempPassword}

Sign in to CityFix at: ${params.loginUrl}

IMPORTANT: You must set a new password upon your first sign-in. This temporary password will expire in 7 days.

--
CityFix Municipal Operations Team
`;

  return { subject, html, text };
};

/**
 * Template for sending a security notification after a password has been changed.
 */
export const passwordChanged = (
  params: PasswordChangedParams,
): EmailContent => {
  const safeName = escapeHtml(params.name);
  const subject = "Your CityFix password has been changed";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #03604c 0%, #a855f7 100%); padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 15px; }
    .greeting { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .alert-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 8px; margin: 20px 0; color: #166534; font-size: 14px; }
    .warning { color: #b91c1c; font-size: 13px; margin-top: 20px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CityFix Security Alert</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${safeName},</div>
      <p>This is a confirmation that the password for your CityFix account has been successfully changed.</p>
      
      <div class="alert-box">
        All previous active sessions have been signed out for your security. Please sign in again with your new password.
      </div>

      <p class="warning">
        If you did NOT make this change, please contact system administration immediately to secure your account.
      </p>
    </div>
    <div class="footer">
      CityFix Municipal Platform Security Notification
    </div>
  </div>
</body>
</html>`;

  const text = `Hello ${params.name},

This is a confirmation that the password for your CityFix account has been successfully changed.

All previous active sessions have been revoked for your security. Please sign in again with your new password.

If you did NOT make this change, please contact system administration immediately to secure your account.

--
CityFix Security Team
`;

  return { subject, html, text };
};
