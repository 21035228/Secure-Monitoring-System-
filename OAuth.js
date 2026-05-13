const express = require('express');
const { OAuthMails, OAuthViewMail, OAuthSendMail, OAuthDeleteMail } = require('../controllers/OAuthMailControllers');
const router = express.Router();
const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(),
});


router.route('/mailslist').post(OAuthMails);
router.route('/viewmails').post(OAuthViewMail);
router.route('/sendmails').post(upload.array("files"), OAuthSendMail);
router.route('/deletemails').post(OAuthDeleteMail);


module.exports = router;
