const express = require('express');
const { APItest } = require('../controllers/TestController');
const { LoginUser, ChangePassword, CreateUserSendOTP, UpdateUserVerifyOTP, UpdateUserSendOTP, CreateUserVerifyOTP } = require('../controllers/UserAccessDetailsController');
const multer = require("multer");
const { SendMail } = require('../controllers/Mail');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });



//test
router.route('/test').get(APItest);

//access api
router.route('/userlogin').post(LoginUser);

//password
router.route('/changepassword').post(ChangePassword);
router.route('/createusersendotp').post(CreateUserSendOTP);
router.route('/createuserupdateotp').post(CreateUserVerifyOTP);
router.route('/updateusersendotp').post(UpdateUserSendOTP);
router.route('/updateuserverifyotp').post(UpdateUserVerifyOTP);


router.post(
    "/send-mail",
    upload.array("files"),
    SendMail
);


module.exports = router;
