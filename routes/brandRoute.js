// routes/brandRoute.js
const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const {
    createBrand,
    getAllBrands,
    getBrandById,
    updateBrand,
    deleteBrand
} = require('../controllers/brandController.js');

// กำหนดสิทธิ์สำหรับ Admin และ Super Admin
const adminAccess = ['ADMIN', 'SUPER_ADMIN'];
// GET routes ไม่ต้องใส่ roleCheck เพื่อให้ทุก Role ที่ Login แล้วดูได้
router.get('/', getAllBrands);
router.get('/:id', getBrandById);

// POST, PUT, DELETE routes ต้องจำกัดสิทธิ์
router.post('/', authCheck, roleCheck(adminAccess), createBrand);
router.put('/:id', authCheck, roleCheck(adminAccess), updateBrand);
router.delete('/:id', authCheck, roleCheck(adminAccess), deleteBrand);

module.exports = router;