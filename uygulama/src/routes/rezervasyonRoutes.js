const express = require('express');
const rezervasyonController = require('../controllers/rezervasyonController');
const { oturumZorunlu } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(oturumZorunlu);
router.get('/', rezervasyonController.listele);
router.post('/', rezervasyonController.olustur);
router.delete('/:id', rezervasyonController.iptal);

module.exports = router;
