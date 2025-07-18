// routes/userRoute.js
const express = require('express');
const router = express.Router();

const { authCheck } = require('../middlewares/authMiddleware');
const { roleCheck } = require('../middlewares/roleCheckMiddleware');

// 1. Import Controller เข้ามาทั้ง Object
const userController = require('../controllers/userController');

// --- Routes ที่ต้องการแค่การล็อกอิน (authCheck) ---
// 2. เรียกใช้ฟังก์ชันผ่าน Object 'userController'
router.patch('/me/profile', authCheck, userController.updateMyProfile);
router.patch('/me/password', authCheck, userController.changeMyPassword);


// --- Routes ที่ต้องการสิทธิ์ SUPER_ADMIN ---
const superAdminOnly = [authCheck, roleCheck(['SUPER_ADMIN'])];

router.get('/', superAdminOnly, userController.getAllUsers);
router.post('/', superAdminOnly, userController.createUser);
router.put('/:id', superAdminOnly, userController.updateUser);
router.patch('/:id/status', superAdminOnly, userController.updateUserStatus);
router.delete('/:id', superAdminOnly, userController.deleteUser);


module.exports = router;