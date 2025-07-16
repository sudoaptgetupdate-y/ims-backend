// controllers/authController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * ฟังก์ชันสำหรับลงทะเบียนผู้ใช้ใหม่
 */
exports.register = async (req, res) => {
    try {
        // 1. ดึงข้อมูลจาก request body
        const { email, password, name } = req.body;

        // 2. เข้ารหัสผ่าน (Hashing)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. สร้างผู้ใช้ใหม่ในฐานข้อมูล
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
            },
        });

        // 4. ส่งข้อมูลผู้ใช้ใหม่กลับไป (แต่ไม่ต้องส่งรหัสผ่านกลับไป)
        const userToReturn = { ...newUser };
        delete userToReturn.password;

        res.status(201).json(userToReturn);
    } catch (error) {
        // 5. ดักจับ Error กรณี Email ซ้ำ (P2002)
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This email is already in use.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not register the user.' });
    }
};

/**
 * ฟังก์ชันสำหรับเข้าสู่ระบบ
 */
exports.login = async (req, res) => {
    try {
        // 1. เปลี่ยนจาก email เป็น username
        const { username, password } = req.body;

        // 2. ค้นหาผู้ใช้จาก username แทน email
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        if (user.accountStatus !== 'ACTIVE') {
            return res.status(403).json({ error: 'This account has been disabled.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                username: user.username, // <-- เปลี่ยนเป็น username
                name: user.name,
                role: user.role,
            },
        };

        const token = jwt.sign(
            payload,
            process.env.SECRET,
            { expiresIn: '1d' }
        );
        
        res.status(200).json({
            message: 'Login successful',
            token,
            user: payload.user
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
};