const express = require('express');
const menuController = require('../controllers/menuController');
const { oturumOpsiyonel } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/filtreler', menuController.filtreler);
router.get('/gunun', oturumOpsiyonel, menuController.gununMenusu);
router.get('/haftalik', oturumOpsiyonel, menuController.haftalikMenuler);

module.exports = router;
