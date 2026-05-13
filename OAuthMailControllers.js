const { google } = require("googleapis");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const UserDetailsModel = require("../modules/UserDetailsModules");
const ClamScan = require("clamscan");

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

const createOAuthClient = () => {
    return new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URI
    );
};

const getOrCreateLabel = async (gmail, labelName) => {
    const labelsRes = await gmail.users.labels.list({ userId: "me" });
    const labels = labelsRes.data.labels || [];

    let label = labels.find(l => l.name === labelName);

    if (!label) {
        const newLabel = await gmail.users.labels.create({
            userId: "me",
            requestBody: {
                name: labelName,
                labelListVisibility: "labelShow",
                messageListVisibility: "show",
            },
        });
        label = newLabel.data;
    }

    return label.id;
};

async function initClam() {
    return await new ClamScan().init({
        clamdscan: {
            active: true
        },
        clamscan: {
            path: process.env.CLAMAV_PATH || "clamscan",
        }
    });
}

exports.GetToken = (req, res) => {
    const { platform } = req.query;

    const oauth2Client = createOAuthClient();

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "openid",
            "email",
            "profile",
        ],
        state: platform,
    });

    return res.redirect(authUrl);
};

exports.GetTokenCallBack = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).send("No authorization code received");
        }

        const oauth2Client = createOAuthClient(); // ✅ NEW INSTANCE

        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);

        // ✅ Get user info
        const { data: user } = await axios.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                },
            }
        );

        // ✅ Get existing user (important for refreshToken)
        const existingUser = await UserDetailsModel.findOne({
            mailID: user.email,
        });

        // ✅ Save safely
        const userDetails = await UserDetailsModel.findOneAndUpdate(
            { mailID: user.email },
            {
                userName: user.name,
                mailID: user.email,
                image: user.picture,
                accessToken: tokens.access_token,
                refreshToken:
                    tokens.refresh_token || existingUser?.refreshToken, // 🔥 FIX
                type: "google",
            },
            { upsert: true, new: true }
        );

        // ✅ Encode params
        const params = new URLSearchParams({
            sts: "oauth-success",
            value: user.email,
            name: user.name,
            image: user.picture,
            _id: userDetails._id.toString(),
            type: "google",
        });

        // 📱 MOBILE
        if (state === "mobile") {
            return res.redirect(`myapp://auth/callback?${params.toString()}`);
        }

        // 🌐 WEB
        return res.send(`
            <script>
                window.opener.postMessage(
                    ${JSON.stringify(Object.fromEntries(params))},
                    "${process.env.FRONTEND_URL}"
                );
                window.close();
            </script>
        `);

    } catch (error) {
        console.error("OAuth Error:", error);

        return res.status(500).json({
            type: "oauth-error",
            errormsg: error.message || "OAuth failed",
        });
    }
};

exports.OAuthMails = async (req, res) => {
    try {
        const { _id, pageToken, page = "INBOX" } = req.body;

        const user = await UserDetailsModel.findById(_id);
        if (!user || !user.refreshToken) {
            return res.status(401).json({ errormsg: "Unauthorized" });
        }

        // ✅ Create NEW client per request
        const oauth2Client = createOAuthClient();

        oauth2Client.setCredentials({
            refresh_token: user.refreshToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        let labelIds = page.toUpperCase();

        const list = await gmail.users.messages.list({
            userId: "me",
            maxResults: 20,
            pageToken: pageToken || undefined,
            labelIds: [labelIds],
        });

        const messages = list.data.messages || [];

        const labelsRes = await gmail.users.labels.list({ userId: "me" });

        const labelMap = {};
        (labelsRes.data.labels || []).forEach(label => {
            labelMap[label.name] = label.id;
        });

        const dangerLabelId = labelMap["DANGER"];
        const safeLabelId = labelMap["SAFE"];

        const emails = await Promise.all(
            messages.map(async (msg) => {
                try {
                    const mail = await gmail.users.messages.get({
                        userId: "me",
                        id: msg.id,
                        format: "metadata",
                        metadataHeaders: ["Subject", "From", "Date"],
                    });

                    const headers = mail?.data?.payload?.headers || [];
                    const labelIds = mail?.data?.labelIds || [];

                    return {
                        id: msg.id,
                        subject:
                            headers.find(h => h.name === "Subject")?.value || "(No Subject)",
                        from:
                            headers.find(h => h.name === "From")?.value || "(Unknown)",
                        date:
                            headers.find(h => h.name === "Date")?.value || "",
                        snippet: mail.data.snippet || "",

                        status: labelIds.includes(dangerLabelId)
                            ? "DANGER"
                            : labelIds.includes(safeLabelId)
                                ? "SAFE"
                                : "UNKNOWN",
                    };

                } catch {
                    return { id: msg.id, errormsg: "Failed to fetch" };
                }
            })
        );

        return res.json({
            success: true,
            emails,
            nextPageToken: list.data.nextPageToken || null,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ errormsg: err.message });
    }
};

exports.OAuthViewMail = async (req, res) => {
    try {
        const { id, _id } = req.body;

        const user = await UserDetailsModel.findById(_id);
        if (!user || !user.refreshToken) {
            return res.status(401).json({ errormsg: "Unauthorized" });
        }

        const oauth2Client = createOAuthClient();
        oauth2Client.setCredentials({
            refresh_token: user.refreshToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        const mail = await gmail.users.messages.get({
            userId: "me",
            id,
            format: "full",
        });

        const payload = mail?.data?.payload || {};

        // ✅ Decode
        const decode = (data) => {
            if (!data) return "";
            return Buffer.from(
                data.replace(/-/g, "+").replace(/_/g, "/"),
                "base64"
            ).toString("utf-8");
        };

        // ✅ Recursive body
        const getBody = (part) => {
            if (!part) return "";

            if (part.mimeType === "text/html" && part.body?.data) {
                return decode(part.body.data);
            }

            if (part.mimeType === "text/plain" && part.body?.data) {
                return decode(part.body.data);
            }

            if (part.parts) {
                for (const p of part.parts) {
                    const result = getBody(p);
                    if (result) return result;
                }
            }

            return "";
        };

        const body = getBody(payload);

        // ✅ Headers
        const headers = payload.headers || [];
        const getHeader = (name) =>
            headers.find((h) => h.name === name)?.value || "";

        const subject = getHeader("Subject");
        const from = getHeader("From");
        const to = getHeader("To");
        const date = getHeader("Date");

        // 🔥 ClamAV
        const clamscan = await initClam();


        let hasVirus = false; // ✅ IMPORTANT

        const attachments = [];

        const extractAttachments = async (parts = []) => {
            for (const part of parts) {
                if (part.filename && part.body?.attachmentId) {
                    try {
                        const attachment = await gmail.users.messages.attachments.get({
                            userId: "me",
                            messageId: id,
                            id: part.body.attachmentId,
                        });

                        const buffer = Buffer.from(
                            attachment.data.data.replace(/-/g, "+").replace(/_/g, "/"),
                            "base64"
                        );

                        const tempPath = path.join(os.tmpdir(), `${Date.now()}_${part.filename}`);

                        // write buffer to temp file
                        fs.writeFileSync(tempPath, buffer);


                        const { isInfected, viruses } = await clamscan.scanFile(tempPath);

                        fs.unlinkSync(tempPath);

                        if (isInfected) hasVirus = true; // 🔥 mark danger

                        attachments.push({
                            filename: part.filename,
                            mimeType: part.mimeType,
                            size: part.body.size,
                            isInfected,
                            viruses: isInfected ? viruses : [],
                            status: isInfected ? "infected" : "safe",
                            data: buffer.toString("base64") // ✅ IMPORTANT
                        });

                    } catch (err) {
                        console.error("Attachment error:", err);
                        attachments.push({
                            status: "error",
                            filename: part.filename,
                            errormsg: "Failed to scan attachment",
                        });
                    }
                }

                if (part.parts) {
                    await extractAttachments(part.parts);
                }
            }
        };

        if (payload.parts) {
            await extractAttachments(payload.parts);
        }

        // 🔥 LABEL LOGIC
        const safeLabelId = await getOrCreateLabel(gmail, "SAFE");
        const dangerLabelId = await getOrCreateLabel(gmail, "DANGER");

        await gmail.users.messages.modify({
            userId: "me",
            id,
            requestBody: {
                addLabelIds: [hasVirus ? dangerLabelId : safeLabelId],
                removeLabelIds: [hasVirus ? safeLabelId : dangerLabelId],
            },
        });

        return res.json({
            success: true,
            id,
            subject,
            from,
            to,
            date,
            body,
            attachments,
            status: hasVirus ? "DANGER" : "SAFE", // ✅ final result
        });

    } catch (err) {
        console.error("OAuthViewMail Error:", err);

        return res.status(500).json({
            success: false,
            errormsg: err.message || "Failed to fetch mail",
        });
    }
};

exports.OAuthSendMail = async (req, res) => {
    try {
        const { to, subject, body, _id } = req.body;
        const files = req.files;

        if (!to || !subject || !body) {
            return res.status(400).json({
                errormsg: "to, subject, and body are required",
            });
        }


        const clamscan = await initClam();

        let hasVirus = false;
        const attachments = [];

        const boundary = "----=_Part_123456";

        // 🔍 Scan all files first
        for (const file of files) {
            const tempPath = path.join(os.tmpdir(), file.originalname);

            try {
                // Save temp file
                fs.writeFileSync(tempPath, file.buffer);

                // Scan
                const { isInfected, viruses } = await clamscan.scanFile(tempPath);

                // Delete temp file
                fs.unlinkSync(tempPath);

                if (isInfected) {
                    hasVirus = true;

                    return res.status(400).json({
                        success: false,
                        errormsg: `Virus detected in ${file.originalname}`,
                        viruses,
                    });
                }

                // If safe → prepare attachment
                const fileContent = file.buffer.toString("base64");

                attachments.push(
                    `--${boundary}`,
                    `Content-Type: ${file.mimetype}; name="${file.originalname}"`,
                    `Content-Transfer-Encoding: base64`,
                    `Content-Disposition: attachment; filename="${file.originalname}"`,
                    ``,
                    fileContent,
                    ``
                );

            } catch (err) {
                console.error("Scan error:", err);

                return res.status(500).json({
                    success: false,
                    errormsg: `Error scanning file ${file.originalname}`,
                });
            }
        }

        const user = await UserDetailsModel.findById(_id);
        if (!user || !user.refreshToken) {
            return res.status(401).json({ errormsg: "Unauthorized" });
        }

        // ✉️ Setup Gmail OAuth
        const oauth2Client = createOAuthClient();
        oauth2Client.setCredentials({
            refresh_token: user.refreshToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // 📧 Build full email with attachments
        const messageParts = [
            `From: me`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            ``,

            // Body
            `--${boundary}`,
            `Content-Type: text/html; charset="UTF-8"`,
            ``,
            body,
            ``,

            // Attachments
            ...attachments,

            `--${boundary}--`,
        ];

        const message = messageParts.join("\n");

        const encodedMessage = Buffer.from(message)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        // 📤 Send email
        const result = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage,
            },
        });

        return res.json({
            success: true,
            messageId: result.data.id,
            errormsg: "Email sent successfully with scanned attachments",
        });

    } catch (err) {
        console.error("SendMail Error:", err);

        return res.status(500).json({
            success: false,
            errormsg: err.message,
        });
    }
};

exports.OAuthDeleteMail = async (req, res) => {
    try {
        const { id } = req.query; // mail ID to delete

        if (!id) {
            return res.status(400).json({ errormsg: "Mail ID is required" });
        }

        // Set OAuth2 credentials
        oauth2Client.setCredentials({
            refresh_token: process.env.REFRESH_TOKEN,
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Delete the email
        await gmail.users.messages.delete({
            userId: 'me',
            id,
        });

        res.json({
            success: true,
            errormsg: `Mail with ID ${id} has been deleted`,
        });

    } catch (err) {
        res.status(500).json({ errormsg: err.message });
    }
};

exports.ScanFiles = async (req, res) => {
    try {
        const files = req.files;



        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                errormsg: "No files uploaded",
            });
        }

        const clamscan = await initClam();

        const results = [];

        let hasVirus = false;

        for (const file of files) {
            try {
                // ✅ Save temp file
                const tempPath = path.join(os.tmpdir(), file.originalname);

                fs.writeFileSync(tempPath, file.buffer);

                // ✅ Scan file
                const { isInfected, viruses } = await clamscan.scanFile(tempPath);

                // ✅ Delete temp file
                fs.unlinkSync(tempPath);

                if (isInfected) hasVirus = true;

                results.push({
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    isInfected,
                    viruses: isInfected ? viruses : [],
                    status: isInfected ? "infected" : "safe",
                });

            } catch (err) {
                console.error("Scan error:", err);

                results.push({
                    filename: file.originalname,
                    errormsg: err.message,
                    status: "infected",
                });
            }
        }

        return res.json({
            success: true,
            overallStatus: hasVirus ? "DANGER" : "SAFE",
            files: results,
        });

    } catch (err) {
        console.error("ScanFiles Error:", err);

        return res.status(500).json({
            success: false,
            errormsg: err.message || "Scan failed",
        });
    }
};