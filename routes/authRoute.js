// routes/authRoute.js

const express = require('express');
const router = express.Router();

// นำเข้าฟังก์ชันจาก Controller
const { register, login } = require('../controllers/authController.js');

// -- กำหนดเส้นทาง (Endpoints) --

// POST /api/auth/register -> ลงทะเบียนผู้ใช้ใหม่
router.post('/register', register);

// POST /api/auth/login -> เข้าสู่ระบบ
router.post('/login', login);

module.exports = router;