const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
});

exports.transporter = transporter;

exports.sendEmail = async ({ to, subject, html }) => {
    return await transporter.sendMail({
        from: `"SLAA Platform" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });
};
