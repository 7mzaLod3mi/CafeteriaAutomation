const express = require('express');
const degerlendirmeController = require('../controllers/degerlendirmeController');
const { oturumZorunlu } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(oturumZorunlu);
router.get('/', degerlendirmeController.listele);
router.post('/', degerlendirmeController.olustur);

module.exports = router;
