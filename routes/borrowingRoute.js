// routes/borrowingRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const {
    createBorrowing,
    getAllBorrowings,
    returnItems
} = require('../controllers/borrowingController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// --- กำหนดเส้นทาง (Endpoints) ---

// ดูข้อมูลการยืมได้ทุกคนที่ล็อกอิน
router.get('/', authCheck, getAllBorrowings);

// สร้างและคืน ต้องเป็น Admin หรือ Super Admin
router.post('/', authCheck, roleCheck(adminAccess), createBorrowing);
router.patch('/:borrowingId/return', authCheck, roleCheck(adminAccess), returnItems);

module.exports = router;