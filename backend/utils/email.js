const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendEmail = async ({ to, subject, html }) => {
    return await resend.emails.send({
        from: `SLAA Platform <onboarding@resend.dev>`,
        to: [to],
        subject,
        html,
    });
};
