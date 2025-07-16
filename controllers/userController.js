// controllers/userController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// ดึงผู้ใช้ทั้งหมด (สำหรับ Super Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        // ค้นหาจาก name และ email
        const where = searchTerm
            ? {
                OR: [
                    { name: { contains: searchTerm } },
                    { email: { contains: searchTerm } }
                ]
            }
            : {};

        const [users, totalItems] = await prisma.$transaction([
             prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                // คง select เดิมไว้เพื่อไม่ให้แสดงรหัสผ่าน
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    accountStatus: true,
                    createdAt: true,
                }
            }),
            prisma.user.count({ where })
        ]);
       
        res.status(200).json({
            data: users,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch users.' });
    }
};

// สร้างผู้ใช้ใหม่โดย Super Admin
exports.createUser = async (req, res) => {
    const { email, password, name, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role, // สามารถกำหนด Role ได้
            }
        });
        const { password: _, ...userToReturn } = newUser;
        res.status(201).json(userToReturn);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This email is already in use.' });
        }
        res.status(500).json({ error: 'Could not create the user.' });
    }
};

// อัปเดตข้อมูลผู้ใช้ (Name, Email, Role)
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;
    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { name, email, role },
        });
        const { password, ...userToReturn } = updatedUser;
        res.status(200).json(userToReturn);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This email is already in use by another account.' });
        }
        res.status(500).json({ error: 'Could not update the user.' });
    }
};

// อัปเดตสถานะบัญชี (Enable/Disable)
exports.updateUserStatus = async (req, res) => {
    const { id } = req.params;
    const { accountStatus } = req.body; // รับแค่ 'ACTIVE' หรือ 'DISABLED'
    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { accountStatus },
            select: { id: true, name: true, accountStatus: true }
        });
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Could not update user status.' });
    }
};

// ลบผู้ใช้
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Could not delete user.' });
    }
};

/**
 * ฟังก์ชันสำหรับให้ผู้ใช้ที่ล็อกอินอยู่ อัปเดตข้อมูลของตัวเอง (เช่น ชื่อ)
 */
exports.updateMyProfile = async (req, res) => {
    const { id } = req.user; // ดึง id จาก token
    const { name, username, email } = req.body; // 1. รับข้อมูลทั้ง 3 ฟิลด์จาก body

    // 2. ตรวจสอบว่ามีข้อมูลที่จำเป็นครบถ้วน
    if (!name || !username || !email) {
        return res.status(400).json({ error: 'Name, Username, and Email are required.' });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { name, username, email }, // 3. อัปเดตข้อมูลทั้ง 3 ฟิลด์
        });

        // ส่งข้อมูลผู้ใช้ที่อัปเดตแล้วกลับไป (ยกเว้นรหัสผ่าน)
        const { password, ...userToReturn } = updatedUser;
        res.status(200).json(userToReturn);
        
    } catch (error) {
        // 4. ดักจับ Error กรณี username หรือ email ซ้ำ
        if (error.code === 'P2002') {
            // Prisma จะบอกว่าฟิลด์ไหนที่ซ้ำใน error.meta.target
            const field = error.meta.target[0];
            return res.status(400).json({ error: `This ${field} is already in use.` });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not update your profile.' });
    }
};

/**
 * ฟังก์ชันสำหรับให้ผู้ใช้ที่ล็อกอินอยู่ เปลี่ยนรหัสผ่านของตัวเอง
 */
exports.changeMyPassword = async (req, res) => {
    const { id } = req.user; // ดึง id จาก token
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Please provide both current and new passwords.' });
    }

    try {
        // 1. ดึงข้อมูลผู้ใช้ รวมถึงรหัสผ่านปัจจุบันที่เข้ารหัสไว้
        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // 2. ตรวจสอบว่ารหัสผ่านปัจจุบันที่กรอกมา ถูกต้องหรือไม่
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid current password.' });
        }

        // 3. เข้ารหัสรหัสผ่านใหม่
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 4. อัปเดตรหัสผ่านใหม่ลงฐานข้อมูล
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { password: hashedPassword },
        });

        res.status(200).json({ message: 'Password changed successfully.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not change password.' });
    }
};