// routes/dashboardRoute.js
const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware');
const { roleCheck } = require('../middlewares/roleCheckMiddleware'); // 1. Import roleCheck

// 2. Import ฟังก์ชันใหม่เข้ามาด้วย
const { 
    getDashboardStats, 
    getEmployeeDashboardStats 
} = require('../controllers/dashboardController');

// 3. กำหนด Role ที่จะเข้าถึง Dashboard ของ Admin
const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// 4. จำกัดสิทธิ์ Route เดิม
router.get('/stats', authCheck, roleCheck(adminAccess), getDashboardStats);

// 5. เพิ่ม Route ใหม่สำหรับ Employee
router.get('/employee-stats', authCheck, getEmployeeDashboardStats);

module.exports = router;