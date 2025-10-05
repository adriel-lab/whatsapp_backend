// src/api/routes/sessionRoutes.js
const express = require('express');
const sessionController = require('../controllers/sessionController');
const router = express.Router();

router.post('/session/start', sessionController.start);

module.exports = router;