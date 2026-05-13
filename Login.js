const express = require('express');
const { GetToken, GetTokenCallBack } = require('../controllers/OAuthMailControllers');
const router = express.Router();

router.route('/auth/google').get(GetToken);
router.route('/auth/google/callback').get(GetTokenCallBack);



module.exports = router;
