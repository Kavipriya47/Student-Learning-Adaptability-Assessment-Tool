const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
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
