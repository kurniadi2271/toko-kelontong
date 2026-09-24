const nodemailer = require('nodemailer');

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendPasswordResetEmail(toEmail, rawToken) {
  const resetLink = `${process.env.RESET_PASSWORD_URL}?token=${rawToken}`;

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: 'Pemulihan Password Admin - Kasir Asri',
    html: `
      <p>Kami menerima permintaan reset password untuk akun admin Anda.</p>
      <p>Klik tautan berikut untuk membuat password baru (berlaku 30 menit):</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Jika Anda tidak meminta ini, abaikan email ini.</p>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
