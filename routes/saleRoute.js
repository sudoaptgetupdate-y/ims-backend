// routes/saleRoute.js

const express = require('express');
const router = express.Router();

const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const {
    createSale,
    getAllSales,
    getSaleById,
    deleteSale,
    updateSale
} = require('../controllers/saleController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];
const superAdminAccess = ['SUPER_ADMIN'];

// -- กำหนดเส้นทาง (Endpoints) --

// GET routes - อนุญาตให้ทุก Role ดูได้
router.get('/', authCheck, getAllSales);
router.get('/:id', authCheck, getSaleById);

// POST, PUT, DELETE routes - จำกัดสิทธิ์
router.post('/', authCheck, roleCheck(adminAccess), createSale);
router.put('/:id', authCheck, roleCheck(adminAccess), updateSale);
router.delete('/:id', authCheck, roleCheck(superAdminAccess), deleteSale);


module.exports = router;