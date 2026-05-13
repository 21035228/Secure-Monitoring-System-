const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
    referDocId: { type: String, required: true, unique: false },
    EmployeeId: { type: String, required: true, unique: false },
    ModuleName: { type: String, required: true },
    Sts: { type: String, required: true },
    data: { type: Object, required: false },
}, { collection: 'AccessLog', timestamps: true });

const AccessLogModel = mongoose.model('AccessLog', logSchema);
module.exports = AccessLogModel;