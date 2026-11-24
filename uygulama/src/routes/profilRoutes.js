const express = require('express');
const profilController = require('../controllers/profilController');
const { oturumZorunlu } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(oturumZorunlu);
router.get('/', profilController.getir);
router.put('/alerjenler', profilController.alerjenleriGuncelle);

module.exports = router;
