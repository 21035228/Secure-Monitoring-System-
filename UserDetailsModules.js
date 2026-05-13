const mongoose = require('mongoose');

const userDetailsSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    mailID: { type: String, required: true, lowercase: true },
    password: { type: String, required: false },
    image: { type: String, required: false },
    accessToken: { type: String, required: false },
    refreshToken: { type: String, required: false },
    type: { type: String, required: false },
}, {
    collection: 'UserDetails'
});
const UserDetailsModel = mongoose.model('UserDetails', userDetailsSchema);
module.exports = UserDetailsModel;
