const express = require('express');
const multer = require('multer');
const campaignController = require('../controllers/campaignController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Pasta para arquivos temporários

router.post('/campaign/start', upload.single('contacts'), campaignController.startCampaign);

module.exports = router;