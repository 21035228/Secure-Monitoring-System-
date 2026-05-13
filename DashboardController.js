const { google } = require("googleapis");
const UserDetailsModel = require("../modules/UserDetailsModules");

const createOAuthClient = () => {
    return new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URI
    );
};


exports.OAuthDashboardStats = async (req, res) => {
    try {
        const { _id } = req.body;

        const user = await UserDetailsModel.findById(_id);
        if (!user || !user.refreshToken) {
            return res.status(401).json({ errormsg: "Unauthorized" });
        }

        const oauth2Client = createOAuthClient();
        oauth2Client.setCredentials({
            refresh_token: user.refreshToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // ✅ Get today's date in Gmail format
        const todayStr = new Date()
            .toISOString()
            .split("T")[0]
            .replace(/-/g, "/");

        // ✅ Fetch only today's emails
        const list = await gmail.users.messages.list({
            userId: "me",
            q: `after:${todayStr}`,
            maxResults: 100,
        });

        const messages = list.data.messages || [];

        // ✅ Get label IDs
        const labelsRes = await gmail.users.labels.list({ userId: "me" });

        const labelMap = {};
        (labelsRes.data.labels || []).forEach(label => {
            labelMap[label.name] = label.id;
        });

        const dangerLabelId = labelMap["DANGER"];
        const safeLabelId = labelMap["SAFE"];

        let totalToday = messages.length;
        let totalSafe = 0;
        let totalDanger = 0;
        let totalUnScans = 0;

        // ⚡ Only fetch labelIds (lightweight)
        await Promise.all(
            messages.map(async (msg) => {
                try {
                    const mail = await gmail.users.messages.get({
                        userId: "me",
                        id: msg.id,
                        format: "minimal", // ⚡ FAST
                    });

                    const labels = mail.data.labelIds || [];

                    if (labels.includes(dangerLabelId)) totalDanger++;
                    else if (labels.includes(safeLabelId)) totalSafe++;
                    else totalUnScans++;

                } catch (err) {
                    console.error("Mail fetch error:", err);
                }
            })
        );

        return res.json({
            success: true,
            stats: {
                totalToday,
                totalSafe,
                totalDanger,
                totalUnScans
            },
        });

    } catch (err) {
        console.error("Dashboard Error:", err);

        return res.status(500).json({
            success: false,
            errormsg: err.message,
        });
    }
};