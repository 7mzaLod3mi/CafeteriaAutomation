const express = require('express');
const yoneticiController = require('../controllers/yoneticiController');
const { oturumZorunlu, rolZorunlu } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(oturumZorunlu, rolZorunlu('yonetici'));
router.get('/panel', yoneticiController.panel);
router.get('/menuler/:id', yoneticiController.menuGetir);
router.post('/menuler', yoneticiController.menuOlustur);
router.put('/menuler/:id', yoneticiController.menuGuncelle);
router.post('/turnike-gecis', yoneticiController.turnikeGecis);

module.exports = router;
