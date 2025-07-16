// routes/userRoute.js
const express = require('express');
const router = express.Router();

const { authCheck } = require('../middlewares/authMiddleware');
const { roleCheck } = require('../middlewares/roleCheckMiddleware');

const { 
    getAllUsers, 
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser,
    updateMyProfile,
    changeMyPassword,
} = require('../controllers/userController');

// Route นี้ต้องการแค่การล็อกอิน (authCheck) ไม่ต้องเช็ค Role
router.patch('/me/profile', authCheck, updateMyProfile);
// --- เพิ่ม Route ใหม่สำหรับเปลี่ยนรหัสผ่าน ---
router.patch('/me/password', authCheck, changeMyPassword);
// กำหนดให้ทุก Route ในไฟล์นี้ต้องผ่าน authCheck และ roleCheck('SUPER_ADMIN') ก่อน
router.use(authCheck, roleCheck(['SUPER_ADMIN']));

router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', updateUserStatus);
router.delete('/:id', deleteUser);

module.exports = router;