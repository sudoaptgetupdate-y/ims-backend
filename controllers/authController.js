// controllers/authController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { email, password, name, username } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                name,
                password: hashedPassword,
            },
        });
        const userToReturn = { ...newUser };
        delete userToReturn.password;
        res.status(201).json(userToReturn);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This email or username is already in use.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not register the user.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
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

        // --- START: ส่วนที่แก้ไข ---
        // เพิ่ม email เข้าไปใน payload ที่จะส่งกลับไปให้หน้าบ้าน
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                email: user.email, // <-- เพิ่มบรรทัดนี้
            },
        };
        // --- END ---

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