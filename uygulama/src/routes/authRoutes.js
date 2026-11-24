const express = require('express');
const authController = require('../controllers/authController');
const { oturumZorunlu } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/giris', authController.giris);
router.post('/cikis', authController.cikis);
router.get('/ben', oturumZorunlu, authController.ben);

module.exports = router;
