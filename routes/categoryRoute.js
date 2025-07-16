// routes/categoryRoute.js

const express = require('express');
const router = express.Router();

// 1. นำเข้า Middleware สำหรับตรวจสอบสิทธิ์
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');

// นำเข้าฟังก์ชันทั้งหมดจาก Controller
const { 
    createCategory, 
    getAllCategories, 
    getCategoryById,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController.js');

// กำหนดสิทธิ์สำหรับ Admin และ Super Admin
const adminAccess = ['ADMIN', 'SUPER_ADMIN'];


// -- กำหนดเส้นทาง (Endpoints) --

// GET routes - อนุญาตให้ทุก Role ที่ Login แล้วดูข้อมูลได้
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// POST, PUT, DELETE routes - จำกัดสิทธิ์เฉพาะ Admin และ Super Admin
router.post('/', authCheck, roleCheck(adminAccess), createCategory);
router.put('/:id', authCheck, roleCheck(adminAccess), updateCategory);
router.delete('/:id', authCheck, roleCheck(adminAccess), deleteCategory);

module.exports = router;