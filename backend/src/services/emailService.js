/**
 * Email service for BRIEVO.
 *
 * Provides reusable email-sending functions used across authentication flows
 * (password-reset emails, support notifications, etc.).
 *
 * Uses Resend as the email provider. Set RESEND_API_KEY and EMAIL_FROM
 * environment variables to enable email sending.
 *
 * SECURITY:
 *   - Never log or print verification codes, reset tokens, or any secrets.
 *   - Never hard-code credentials; always use environment variables.
 */

const { Resend } = require("resend");

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let resendClient = null;
if (EMAIL_ENABLED && RESEND_API_KEY) {
  resendClient = new Resend(RESEND_API_KEY);
}

function logEmail({ to, subject, html }) {
  console.log(`[EMAIL] To: ${to}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[EMAIL] HTML preview: ${html.substring(0, 200)}...`);
  }
}

/**
 * Send an email via Resend.
 *
 * @param {object} options
 * @param {string} options.to      – Recipient email address.
 * @param {string} options.subject – Email subject line.
 * @param {string} options.html    – HTML body content.
 * @returns {Promise<object>}     – Send info on success.
 */
async function sendEmail({ to, subject, html }) {
  logEmail({ to, subject, html });

  if (!EMAIL_ENABLED) {
    console.log("[EMAIL] Email sending disabled (set EMAIL_ENABLED=true to enable).");
    return { messageId: "dev-mock", accepted: [to] };
  }

  if (!resendClient) {
    const err = new Error("RESEND_API_KEY is not configured. Set RESEND_API_KEY and EMAIL_ENABLED=true.");
    err.status = 500;
    throw err;
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    const err = new Error("EMAIL_FROM is not configured. Set EMAIL_FROM to your verified Resend domain email.");
    err.status = 500;
    throw err;
  }

  let result;
  try {
    result = await resendClient.emails.send({
      from,
      to: [to],
      subject,
      html,
    });
  } catch (err) {
    const safeMessage = err.message || "Unknown error";
    console.error(`[EMAIL] Resend request failed: ${safeMessage}`);
    throw err;
  }

  const { data, error } = result;

  if (error) {
    const safeMessage = error.message || "Failed to send email via Resend.";
    console.error(`[EMAIL] Resend error: ${safeMessage}`);
    const err = new Error(safeMessage);
    err.status = 502;
    throw err;
  }

  console.log(`[EMAIL] Resend accepted email. Message ID: ${data?.id}`);
  return { messageId: data?.id, accepted: [to] };
}

/**
 * Send a password-reset email with a reset link.
 *
 * @param {string} email    – Recipient email address.
 * @param {string} resetUrl – Full URL containing the reset token.
 * @returns {Promise<object>} – Send info on success; throws on failure.
 */
async function sendPasswordResetEmail(email, resetUrl) {
  if (!email || typeof email !== "string") {
    const err = new Error("Recipient email is required.");
    err.status = 400;
    throw err;
  }
  if (!resetUrl || typeof resetUrl !== "string") {
    const err = new Error("Reset URL is required.");
    err.status = 400;
    throw err;
  }

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <h1 style="font-size: 22px; margin-bottom: 8px; color: #1a1a1a;">Reset your BRIEVO password</h1>
      <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        We received a request to reset the password for your BRIEVO account.
        Click the button below to choose a new password.
      </p>
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0; text-align: center;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
        This link will expire in 1 hour. If you did not request a password reset,
        you can safely ignore this email — your password will remain unchanged.
      </p>
      <p style="font-size: 13px; color: #71717a; margin-top: 24px;">
        If the button above does not work, copy and paste this URL into your browser:<br/>
        <span style="word-break: break-all; color: #3f3f46;">${resetUrl}</span>
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Reset your BRIEVO password",
    html,
  });
}

/**
 * Send a notification email to the support team when a new ticket is submitted.
 *
 * @param {object} ticket – The created ticket record.
 * @param {string} ticket.name       – Submitter's display name.
 * @param {string} ticket.email      – Submitter's email address.
 * @param {string} ticket.subject    – Ticket subject.
 * @param {string} ticket.message    – Ticket body.
 * @param {string} [ticket.id]       – Ticket ID (if available).
 * @returns {Promise<object>} – Send info on success; throws on failure.
 */
async function sendNewTicketNotification(ticket) {
  const supportEmail = process.env.SUPPORT_EMAIL;
  if (!supportEmail) {
    const err = new Error("SUPPORT_EMAIL is not configured. Cannot send support notification.");
    err.status = 500;
    throw err;
  }

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <h1 style="font-size: 22px; margin-bottom: 8px; color: #1a1a1a;">New Brievo Support Ticket</h1>
      <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        A new support request has been submitted through Brievo.
      </p>
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">From</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0 0 12px 0;">${ticket.name} <${ticket.email}></p>
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">Subject</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0 0 12px 0;">${ticket.subject}</p>
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">Message</p>
        <p style="font-size: 15px; margin: 0; white-space: pre-wrap;">${ticket.message}</p>
      </div>
      ${ticket.id ? `<p style="font-size: 13px; color: #71717a; margin-top: 0;">Ticket ID: ${ticket.id}</p>` : ""}
      <p style="font-size: 14px; line-height: 1.6; margin-top: 24px;">
        Log in to the Brievo admin panel to view and respond to this ticket.
      </p>
      <p style="font-size: 13px; color: #71717a; margin-top: 24px;">
        Brievo Support
      </p>
    </div>
  `;

  return sendEmail({
    to: supportEmail,
    subject: `New Brievo Support Ticket: ${ticket.subject}`,
    html,
  });
}

/**
 * Send a notification email to the support team when a new designer signs up
 * and requests account verification.
 *
 * @param {object} signup
 * @param {string} signup.name       – The designer's display name.
 * @param {string} signup.email      – The designer's email address.
 * @param {string} [signup.id]       – The user ID (if available).
 * @returns {Promise<object>} – Send info on success; throws on failure.
 */
async function sendNewSignupNotification(signup) {
  const supportEmail = process.env.SUPPORT_EMAIL;
  if (!supportEmail) {
    const err = new Error("SUPPORT_EMAIL is not configured. Cannot send signup notification.");
    err.status = 500;
    throw err;
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <h1 style="font-size: 22px; margin-bottom: 8px; color: #1a1a1a;">New Designer Signup</h1>
      <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        A new designer has created an account on Brievo and is awaiting your approval.
      </p>
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">Name</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0 0 12px 0;">${signup.name}</p>
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">Email</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0 0 12px 0;">${signup.email}</p>
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">Status</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0;">Pending Approval</p>
      </div>
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0; text-align: center;">
        <a href="${appUrl}/support/pending-designers" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">
          Review & Approve
        </a>
      </div>
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
        Log in to the Brievo admin panel to approve or reject this designer's account.
      </p>
      <p style="font-size: 13px; color: #71717a; margin-top: 24px;">
        Brievo Support
      </p>
    </div>
  `;

  return sendEmail({
    to: supportEmail,
    subject: `New Designer Signup: ${signup.name}`,
    html,
  });
}

/**
 * Send a notification email when support staff replies to a ticket.
 *
 * @param {string} email   – Recipient email address (from the ticket).
 * @param {string} subject – The support ticket subject.
 * @returns {Promise<object>} – Send info on success; throws on failure.
 */
async function sendSupportReplyEmail(email, subject) {
  if (!email || typeof email !== "string") {
    const err = new Error("Recipient email is required.");
    err.status = 400;
    throw err;
  }
  if (!subject || typeof subject !== "string") {
    const err = new Error("Ticket subject is required.");
    err.status = 400;
    throw err;
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <h1 style="font-size: 22px; margin-bottom: 8px; color: #1a1a1a;">Brievo Support</h1>
      <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        We've responded to your support request:
      </p>
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="font-size: 14px; margin: 0; color: #71717a;">Request</p>
        <p style="font-size: 15px; font-weight: bold; margin: 4px 0 0 0;">${subject}</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">
        Your support request has received a response. Please sign in to Brievo to view the full response and continue the conversation.
      </p>
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0; text-align: center;">
        <a href="${appUrl}/designer/support" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">
          View Support Request
        </a>
      </div>
      <p style="font-size: 13px; color: #71717a; margin-top: 24px;">
        Brievo Support
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Brievo Support has responded to your request",
    html,
  });
}

/**
 * Send a custom password-reset email from the support dashboard.
 *
 * @param {string} email    – Recipient email address.
 * @param {string} subject  – Email subject line.
 * @param {string} message  – Email body (may contain HTML).
 * @returns {Promise<object>} – Send info on success; throws on failure.
 */
async function sendCustomPasswordResetEmail(email, subject, message) {
  if (!email || typeof email !== "string") {
    const err = new Error("Recipient email is required.");
    err.status = 400;
    throw err;
  }
  if (!message || typeof message !== "string") {
    const err = new Error("Message is required.");
    err.status = 400;
    throw err;
  }

  const htmlMessage = message.replace(/\n/g, "<br/>");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <h1 style="font-size: 22px; margin-bottom: 8px; color: #1a1a1a;">${subject || "Password Reset Request"}</h1>
      <div style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        ${htmlMessage}
      </div>
      <p style="font-size: 13px; color: #71717a; margin-top: 24px;">
        Brievo Support
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: subject || "Password Reset Request",
    html,
  });
}

/**
 * Send a notification to the designer when a client submits a project form.
 *
 * @param {object} params
 * @param {string} params.designerEmail  – Designer's email address.
 * @param {string} params.designerName   – Designer's display name.
 * @param {string} params.clientName     – Client's submitted name.
 * @param {string} params.clientEmail    – Client's submitted email.
 * @param {string} [params.formTitle]    – Form title (if available).
 * @returns {Promise<object>} – Send info on success; throws on failure.
 */
async function sendProjectSubmissionNotification({ designerEmail, designerName, clientName, clientEmail, formTitle }) {
  if (!designerEmail || typeof designerEmail !== "string") {
    const err = new Error("Designer email is required.");
    err.status = 400;
    throw err;
  }
  if (!clientName || typeof clientName !== "string") {
    const err = new Error("Client name is required.");
    err.status = 400;
    throw err;
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <h1 style="font-size: 22px; margin-bottom: 8px; color: #1a1a1a;">New Project Submission</h1>
      <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        Hi ${designerName},
      </p>
      <p style="font-size: 15px; line-height: 1.6;">
        A client has submitted their project information${formTitle ? ` through your "${formTitle}" form` : ""}.
      </p>
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">Client</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0 0 12px 0;">${clientName} <${clientEmail}></p>
      </div>
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0; text-align: center;">
        <a href="${appUrl}/designer/forms" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">
          View Submission
        </a>
      </div>
      <p style="font-size: 13px; color: #71717a; margin-top: 24px;">
        Brievo
      </p>
    </div>
  `;

  return sendEmail({
    to: designerEmail,
    subject: `New Project Submission from ${clientName}`,
    html,
  });
}

/**
 * Send a confirmation email from the designer to the client.
 *
 * @param {object} params
 * @param {string} params.clientEmail – Client's email address.
 * @param {string} params.subject     – Email subject line.
 * @param {string} params.message     – Email body (plain text, newlines converted to HTML).
 * @returns {Promise<object>} – Send info on success; throws on failure.
 */
async function sendDesignerConfirmationEmail({ clientEmail, subject, message }) {
  if (!clientEmail || typeof clientEmail !== "string") {
    const err = new Error("Client email is required.");
    err.status = 400;
    throw err;
  }
  if (!message || typeof message !== "string") {
    const err = new Error("Message is required.");
    err.status = 400;
    throw err;
  }

  const htmlMessage = message.replace(/\n/g, "<br/>");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <div style="font-size: 15px; line-height: 1.6;">
        ${htmlMessage}
      </div>
    </div>
  `;

  return sendEmail({
    to: clientEmail,
    subject: subject || "Project Submission Confirmation",
    html,
  });
}

/**
 * Send a notification to BRIEVO Support when a designer requests a password reset.
 *
 * @param {object} params
 * @param {string} [params.name]  – Designer's display name (if available).
 * @param {string} params.email   – Designer's email address.
 * @param {string} [params.date]  – Date/time of the request (ISO string).
 * @returns {Promise<object>} – Send info on success; throws on failure.
 */
async function sendPasswordResetAdminNotification({ name, email, date }) {
  const supportEmail = process.env.SUPPORT_EMAIL;
  if (!supportEmail) {
    const err = new Error("SUPPORT_EMAIL is not configured. Cannot send password reset admin notification.");
    err.status = 500;
    throw err;
  }

  const requestDate = date
    ? new Date(date).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
    : new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <h1 style="font-size: 22px; margin-bottom: 8px; color: #1a1a1a;">Password Reset Request</h1>
      <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        A designer has requested a password reset on Brievo.
      </p>
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        ${name ? `<p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">Designer Name</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0 0 12px 0;">${name}</p>` : ""}
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">Designer Email</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0 0 12px 0;">${email}</p>
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #71717a;">Request Date</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0;">${requestDate}</p>
      </div>
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
        This is an automated notification. No action is required unless you need to follow up with the designer.
      </p>
      <p style="font-size: 13px; color: #71717a; margin-top: 24px;">
        Brievo Support
      </p>
    </div>
  `;

  return sendEmail({
    to: supportEmail,
    subject: "Password Reset Request — Brievo Designer",
    html,
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetAdminNotification,
  sendSupportReplyEmail,
  sendNewTicketNotification,
  sendNewSignupNotification,
  sendCustomPasswordResetEmail,
  sendProjectSubmissionNotification,
  sendDesignerConfirmationEmail,
};