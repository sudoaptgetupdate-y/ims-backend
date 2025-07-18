// controllers/userController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// 1. สร้าง Object ว่างๆ เพื่อเก็บฟังก์ชันทั้งหมด
const userController = {};

// 2. เปลี่ยนจากการใช้ exports.functionName เป็นการเพิ่ม property เข้าไปใน Object
userController.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

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
                select: {
                    id: true,
                    username: true,
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

userController.createUser = async (req, res) => {
    const { email, password, name, role, username } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                name,
                role,
            }
        });
        const { password: _, ...userToReturn } = newUser;
        res.status(201).json(userToReturn);
    } catch (error) {
        if (error.code === 'P2002') {
            const field = error.meta.target[0];
            return res.status(400).json({ error: `This ${field} is already in use.` });
        }
        res.status(500).json({ error: 'Could not create the user.' });
    }
};

userController.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role, username } = req.body;
    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { name, email, role, username },
        });
        const { password, ...userToReturn } = updatedUser;
        res.status(200).json(userToReturn);
    } catch (error) {
        if (error.code === 'P2002') {
            const field = error.meta.target[0];
            return res.status(400).json({ error: `This ${field} is already in use.` });
        }
        res.status(500).json({ error: 'Could not update the user.' });
    }
};

userController.updateUserStatus = async (req, res) => {
    const { id } = req.params;
    const { accountStatus } = req.body;
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

userController.deleteUser = async (req, res) => {
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

userController.updateMyProfile = async (req, res) => {
    const { id } = req.user;
    const { name, username, email } = req.body;

    if (!name || !username || !email) {
        return res.status(400).json({ error: 'Name, Username, and Email are required.' });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { name, username, email },
        });

        const { password, ...userToReturn } = updatedUser;
        res.status(200).json(userToReturn);
        
    } catch (error) {
        if (error.code === 'P2002') {
            const field = error.meta.target[0];
            return res.status(400).json({ error: `This ${field} is already in use.` });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not update your profile.' });
    }
};

userController.changeMyPassword = async (req, res) => {
    const { id } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Please provide both current and new passwords.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid current password.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

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


// 3. Export Object ที่รวบรวมฟังก์ชันทั้งหมดออกไป
module.exports = userController;