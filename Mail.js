const ClamScan = require("clamscan");
const { google } = require("googleapis");
const UserDetailsModel = require("../modules/UserDetailsModules");

async function initClam() {
    return await new ClamScan().init({
        clamdscan: {
            active: false
        },
        clamscan: {
            path: process.env.CLAMAV_PATH || "clamscan",
        }
    });
}


// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

exports.SendMail = async (req, res, next) => {
    try {
        const { _id, to, subject, body } = req.body;

        const user = await UserDetailsModel.findById(_id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).send("No files uploaded");
        }

        const clamscan = await initClam();

        const cleanFiles = [];

        for (const file of files) {
            const { isInfected, viruses } = await clamscan.scanBuffer(file.buffer);

            if (isInfected) {
                return res.status(400).json({
                    errormsg:  `Malware detected in file: ${file.originalname}`,
                    viruses
                });
            }

            cleanFiles.push(file);
        }

        // ✅ If ALL files are safe → send them
        res.set({
            "Content-Type": "application/json"
        });

        // Send files as base64 (since multiple files can't be directly downloaded in one response)
        const responseFiles = cleanFiles.map(file => ({
            filename: file.originalname,
            mimetype: file.mimetype,
            data: file.buffer.toString("base64")
        }));

        if (user.type === "google") {
            oauth2Client.setCredentials({
                access_token: user.accessToken,
                refresh_token: user.refreshToken
            });

            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            const messageParts = [
                `From: me`,
                `To: ${to}`,
                `Subject: ${subject}`,
                `Content-Type: text/html; charset=utf-8`,
                ``,
                body,
            ];

            const message = messageParts.join('\n');

            // Encode to Base64
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            // Send the email
            const result = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });

            return res.json({
                success: true,
                messageId: result.data.id,
            });

        }

        return res.json({
            success: false,
            errormsg:  "All files are safe",
            files: responseFiles
        });

    } catch (err) {
        console.dir(err)
        res.json({
            success: false,
            errormsg: err.message || "Something went wrong",
        });
    }
}