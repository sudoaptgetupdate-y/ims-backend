// routes/assetRoute.js
const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware');
const { roleCheck } = require('../middlewares/roleCheckMiddleware');
const assetController = require('../controllers/assetController');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// --- Asset Routes ---
router.get('/', authCheck, assetController.getAllAssets);
router.post('/', authCheck, roleCheck(adminAccess), assetController.addAsset);
router.patch('/:id/assign', authCheck, roleCheck(adminAccess), assetController.assignAsset);
router.patch('/:id/return', authCheck, roleCheck(adminAccess), assetController.returnAsset);
router.patch('/:id/decommission', authCheck, roleCheck(adminAccess), assetController.decommissionAsset);

module.exports = router;