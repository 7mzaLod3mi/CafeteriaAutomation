const express = require('express');
const bakiyeController = require('../controllers/bakiyeController');
const { oturumZorunlu } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(oturumZorunlu);
router.get('/', bakiyeController.getir);
router.post('/yukle', bakiyeController.yukle);

module.exports = router;
