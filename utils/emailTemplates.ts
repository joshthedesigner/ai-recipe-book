/**
 * Email Templates
 * 
 * HTML email templates for user invitations and notifications
 */

interface InviteEmailData {
  inviterName: string;
  groupName: string;
  role: 'read' | 'write';
  inviteeEmail: string;
  signupUrl: string;
}

interface FriendInviteEmailData {
  senderName: string;
  recipientEmail: string;
  inviteId: string;
  baseUrl: string;
}

/**
 * Generate HTML email for group invitation
 */
export function generateInviteEmail(data: InviteEmailData): { subject: string; html: string } {
  const roleDescription = data.role === 'write' 
    ? 'add and view recipes' 
    : 'view recipes';

  const subject = `${data.inviterName} invited you to their RecipeAssist collection`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recipe Collection Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e0e0e0;">
              <div style="font-size: 32px; margin-bottom: 8px;">🍳</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                RecipeAssist
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
                You've been invited!
              </h2>
              
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                <strong>${data.inviterName}</strong> has invited you to join their recipe collection: <strong>${data.groupName}</strong>
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                You'll be able to <strong>${roleDescription}</strong> in this shared collection.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.signupUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1976d2; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #757575;">
                If you already have an account, simply sign in with <strong>${data.inviteeEmail}</strong> and you'll automatically gain access.
              </p>
              
              <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 20px; color: #757575;">
                If you don't have an account yet, click the button above to sign up and start collaborating!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9e9e9e;">
                This invitation was sent to ${data.inviteeEmail}
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: #9e9e9e;">
                RecipeAssist - Your family recipe collection
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Generate plain text version of invite email (fallback)
 */
export function generateInviteEmailText(data: InviteEmailData): string {
  const roleDescription = data.role === 'write' 
    ? 'add and view recipes' 
    : 'view recipes';

  return `
You've been invited to RecipeAssist!

${data.inviterName} has invited you to join their recipe collection: ${data.groupName}

You'll be able to ${roleDescription} in this shared collection.

Accept your invitation by signing up or signing in with this email: ${data.inviteeEmail}

Visit: ${data.signupUrl}

If you already have an account, simply sign in and you'll automatically gain access.

---
This invitation was sent to ${data.inviteeEmail}
RecipeAssist - Your family recipe collection
  `.trim();
}

/**
 * Generate Friend Invite Email
 * 
 * ROLLBACK NOTE: Remove this function to clean up Friends feature
 */
export function friendInviteEmail(
  senderName: string,
  recipientEmail: string,
  inviteId: string,
  baseUrl: string
): { subject: string; html: string; text: string } {
  const acceptUrl = `${baseUrl}/friends?friend_invite=${inviteId}`;
  
  const subject = `${senderName} wants to share recipes with you!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Friend Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e0e0e0;">
              <div style="font-size: 48px; margin-bottom: 8px;">👋</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                Friend Request
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
                Hey there!
              </h2>
              
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                <strong>${senderName}</strong> wants to share recipes with you on RecipeAssist!
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Click below to accept and start following their cookbook adventures 🍳
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; background-color: #d87430; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Accept Friend Request
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #757575;">
                If you already have a RecipeAssist account, just sign in and accept the request.
              </p>
              
              <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 20px; color: #757575;">
                Don't have an account yet? Sign up with <strong>${recipientEmail}</strong> to get started!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9e9e9e;">
                This friend request was sent to ${recipientEmail}
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: #9e9e9e;">
                RecipeAssist - Your family recipe collection powered by AI
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Hey there! 👋

${senderName} wants to share recipes with you on RecipeAssist!

Click below to accept and start following their cookbook adventures:
${acceptUrl}

If you already have a RecipeAssist account, just sign in and accept the request.
Don't have an account yet? Sign up with ${recipientEmail} to get started!

---
This friend request was sent to ${recipientEmail}
RecipeAssist - Your family recipe collection powered by AI
  `.trim();

  return { subject, html, text };
}

