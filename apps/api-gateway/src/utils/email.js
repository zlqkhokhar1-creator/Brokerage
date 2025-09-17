const nodemailer = require('nodemailer');
const { logger } = require('./logger');
const { transaction } = require('../config/database');

let transporter;

// This async function initializes the transporter.
// We use a self-invoking function to create a top-level await.
(async () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use a real email service
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // For development, create a test account with Ethereal
    try {
      let testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });
    } catch (error) {
      logger.error('Failed to create Ethereal test account:', error);
    }
  }
})();

/**
 * Sends an email.
 * @param {object} mailOptions - { to, subject, text, html }
 */
const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    logger.error('Email transporter not initialized. Cannot send email.');
    return;
  }

  // --- Anti-Phishing Enhancement ---
  const { rows: [user] } = await transaction(client =>
    client.query('SELECT security_phrase FROM users WHERE email = $1', [to])
  );

  let finalHtml = html;
  if (user && user.security_phrase) {
    // Inject the security phrase into the email body
    finalHtml += `<hr><p style="font-size: 10px; color: #777;">Your Security Phrase: <b>${user.security_phrase}</b></p>`;
  }
  // -----------------------------

  try {
    const info = await transporter.sendMail({
      from: `"InvestPro Security" <no-reply@investpro.com>`,
      to: to,
      subject: subject,
      text: text,
      html: finalHtml,
    });

    logger.info('Email sent', { messageId: info.messageId });
    
    if (process.env.NODE_ENV !== 'production') {
      // Log the Ethereal URL so we can preview the sent email
      logger.info('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

  } catch (error) {
    logger.error('Error sending email', { error: error.message });
  }
};

module.exports = {
  sendEmail,
};
