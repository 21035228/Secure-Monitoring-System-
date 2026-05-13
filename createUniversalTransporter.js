const nodemailer = require("nodemailer");

const EMAIL_PROVIDERS = {
    "gmail.com": {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
    },
    "googlemail.com": {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
    },
    "outlook.com": {
        host: "smtp.office365.com",
        port: 587,
        secure: false,
    },
    "hotmail.com": {
        host: "smtp.office365.com",
        port: 587,
        secure: false,
    },
    "live.com": {
        host: "smtp.office365.com",
        port: 587,
        secure: false,
    },
    "office365.com": {
        host: "smtp.office365.com",
        port: 587,
        secure: false,
    },
    "yahoo.com": {
        host: "smtp.mail.yahoo.com",
        port: 465,
        secure: true,
    },
    "zoho.com": {
        host: "smtp.zoho.com",
        port: 465,
        secure: true,
    },
    "icloud.com": {
        host: "smtp.mail.me.com",
        port: 587,
        secure: false,
    },
    "aol.com": {
        host: "smtp.aol.com",
        port: 465,
        secure: true,
    },
    "yandex.com": {
        host: "smtp.yandex.com",
        port: 465,
        secure: true,
    },
    "earthrecycler.com": {
        host: "mail.earthrecycler.com",
        port: 465,
        secure: true,
    }
};

// Detect SMTP based on email domain
function getSMTPConfig(email) {
    const domain = email.split("@")[1];

    if (EMAIL_PROVIDERS[domain]) {
        return EMAIL_PROVIDERS[domain];
    }

    // Fallback for other custom domains
    return {
        host: `mail.${domain}`,
        port: 465,
        secure: true,
    };
}

function createUniversalTransporter() {
    const email = process.env.MAILING_USER;
    const password = process.env.MAILING_PASS;

    const smtp = getSMTPConfig(email);

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
            user: email,
            pass: password,
        },
        tls: {
            rejectUnauthorized: false, // Needed for many custom domains
        }
    });

    return transporter;
}

module.exports = createUniversalTransporter;