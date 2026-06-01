require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;

if (!jwtSecret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
}
if (!databaseUrl) {
    throw new Error('Missing required environment variable: DATABASE_URL');
}

module.exports = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret,
    databaseUrl,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.FROM_EMAIL || 'noreply@localhost'
    }
};
