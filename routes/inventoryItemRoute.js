// routes/inventoryItemRoute.js

const express = require('express');
const router = express.Router();

const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const {
    addInventoryItem,
    getAllInventoryItems,
    getInventoryItemById,
    updateInventoryItem,
    deleteInventoryItem,
    getAssetHistory
} = require('../controllers/inventoryItemController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

router.get('/', getAllInventoryItems);
router.get('/:id', getInventoryItemById);
router.get('/:id/history', authCheck, getAssetHistory);

router.post('/', authCheck, roleCheck(adminAccess), addInventoryItem);
router.put('/:id', authCheck, roleCheck(adminAccess), updateInventoryItem);
router.delete('/:id', authCheck, roleCheck(adminAccess), deleteInventoryItem);

module.exports = router;