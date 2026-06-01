const { smtp } = require('../config/env');

let transporter = null;

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function getTransporter() {
    if (transporter) return transporter;
    if (!smtp.host || !smtp.user) {
        console.warn('Email not configured — notifications will be logged only');
        return null;
    }
    try {
        const nodemailer = require('nodemailer');
        transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: { user: smtp.user, pass: smtp.pass }
        });
        return transporter;
    } catch (err) {
        console.error('Failed to create email transporter:', err.message);
        return null;
    }
}

async function sendEmail(to, subject, html) {
    const t = await getTransporter();
    if (!t) {
        console.log(`[EMAIL MOCK] To: ${to}\nSubject: ${subject}\n${html}`);
        return;
    }
    try {
        await t.sendMail({ from: smtp.from, to, subject, html });
        console.log(`Email sent to ${to}`);
    } catch (err) {
        console.error(`Failed to send email to ${to}:`, err.message);
    }
}

async function sendBookingStatusEmail(booking, newStatus) {
    const name = escapeHtml(booking.name);
    const date = escapeHtml(booking.date);
    const time = escapeHtml(booking.time);
    const service = escapeHtml(booking.service);

    const statusMessages = {
        confirmed: {
            subject: 'Your Appointment at Dejure Law Office is Confirmed',
            title: 'Appointment Confirmed',
            color: '#1e3a5f',
            body: `
                <p>Dear <strong>${name}</strong>,</p>
                <p>Great news! Your appointment has been <strong>confirmed</strong>.</p>
                <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Time:</strong> ${time}</p>
                    <p><strong>Service:</strong> ${service}</p>
                </div>
                <p>Please arrive 10 minutes early and bring relevant documents.</p>
                <p style="font-size:12px;color:#94a3b8;margin-top:16px">This is a system-generated email. Please do not reply. For any queries, contact us at <a href="mailto:contact@dejurelawoffice.com">contact@dejurelawoffice.com</a></p>
                <p>Best regards,<br><strong>Dejure Law Office</strong></p>`
        },
        cancelled: {
            subject: 'Appointment Cancelled — Dejure Law Office',
            title: 'Appointment Cancelled',
            color: '#dc2626',
            body: `
                <p>Dear <strong>${name}</strong>,</p>
                <p>Your appointment has been <strong>cancelled</strong>.</p>
                <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0">
                    <p><strong>Was Scheduled For:</strong> ${date} at ${time}</p>
                    <p><strong>Service:</strong> ${service}</p>
                </div>
                <p>Please contact us if you wish to reschedule.</p>
                <p style="font-size:12px;color:#94a3b8;margin-top:16px">This is a system-generated email. Please do not reply. For any queries, contact us at <a href="mailto:contact@dejurelawoffice.com">contact@dejurelawoffice.com</a></p>
                <p>Best regards,<br><strong>Dejure Law Office</strong></p>`
        },
        completed: {
            subject: 'Appointment Completed — Thank You | Dejure Law Office',
            title: 'Appointment Completed',
            color: '#16a34a',
            body: `
                <p>Dear <strong>${name}</strong>,</p>
                <p>Thank you for meeting with us. Your consultation has been marked as <strong>completed</strong>.</p>
                <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0">
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Service:</strong> ${service}</p>
                </div>
                <p>We appreciate your trust in Dejure Law Office.</p>
                <p style="font-size:12px;color:#94a3b8;margin-top:16px">This is a system-generated email. Please do not reply. For any queries, contact us at <a href="mailto:contact@dejurelawoffice.com">contact@dejurelawoffice.com</a></p>
                <p>Best regards,<br><strong>Dejure Law Office</strong></p>`
        }
    };

    const msg = statusMessages[newStatus];
    if (!msg || !booking.email) return;

    const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:${msg.color};color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:24px">${msg.title}</h1>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
            ${msg.body}
        </div>
        <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px">Dejure Law Office | New Delhi, India</p>
    </div>`;

    await sendEmail(booking.email, msg.subject, html);
}

module.exports = { sendEmail, sendBookingStatusEmail };
