const mongoose = require("mongoose");

const OTPSchema = new mongoose.Schema({
    employeeId: { type: String, required: false },
    OTP: { type: Number, required: true },
    mailID: { type: String, required: true },
    expiresAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'AccessOTPInfo' });

const AccessOTPModel = mongoose.model('AccessOTPInfo', OTPSchema);
module.exports = AccessOTPModel;

