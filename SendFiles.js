const express = require('express');
const path = require('path');
const { ScanFiles } = require('../controllers/OAuthMailControllers');
const router = express.Router();
const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(),
});

router.use(
    "/background",
    express.static(path.join(__dirname, "../Image/Background"))
);

router.route("/scan").post(upload.array("files"), ScanFiles);


module.exports = router;
