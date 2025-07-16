// routes/inventoryItemRoute.js

const express = require('express');
const router = express.Router();

// นำเข้า Middleware และ Controller
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const {
    addInventoryItem,
    getAllInventoryItems,
    getInventoryItemById,
    updateInventoryItem,
    deleteInventoryItem 
} = require('../controllers/inventoryItemController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// -- กำหนดเส้นทาง (Endpoints) --

// GET routes - อนุญาตให้ทุก Role ดูได้
router.get('/', getAllInventoryItems);
router.get('/:id', getInventoryItemById);

// POST, PUT, DELETE routes - จำกัดสิทธิ์
router.post('/', authCheck, roleCheck(adminAccess), addInventoryItem);
router.put('/:id', authCheck, roleCheck(adminAccess), updateInventoryItem);
router.delete('/:id', authCheck, roleCheck(adminAccess), deleteInventoryItem);

module.exports = router;