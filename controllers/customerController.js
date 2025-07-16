// controllers/customerController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * ฟังก์ชันสำหรับสร้าง Customer ใหม่
 */
exports.createCustomer = async (req, res) => {
    try {
        const { customerCode, name, phone, address } = req.body;
        const userId = req.user.id; 
        const newCustomer = await prisma.customer.create({
            data: {
                customerCode,
                name,
                phone,
                address,
                createdById: userId,
            },
        });
        res.status(201).json(newCustomer);
    } catch (error) {
        if (error.code === 'P2002') {
             return res.status(400).json({ error: 'This customer code already exists.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not create the customer' });
    }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูล Customer ทั้งหมด
 */
exports.getAllCustomers = async (req, res) => {
    try {
        // --- START: เพิ่มเงื่อนไขนี้ ---
        // ถ้ามีการส่ง ?all=true ให้ส่งข้อมูลทั้งหมดสำหรับ dropdown
        if (req.query.all === 'true') {
            const allCustomers = await prisma.customer.findMany({
                orderBy: { name: 'asc' },
                include: { createdBy: { select: { name: true } } }
            });
            return res.status(200).json(allCustomers); // ส่งกลับเป็น Array ตรงๆ
        }
        // --- END ---

        // Logic การแบ่งหน้าเดิม
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm 
            ? {
                OR: [
                    { name: { contains: searchTerm } },
                    { customerCode: { contains: searchTerm } },
                    { phone: { contains: searchTerm } }
                ],
            }
            : {};

        const [customers, totalItems] = await prisma.$transaction([
            prisma.customer.findMany({
                where,
                skip: skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { createdBy: { select: { name: true } } }
            }),
            prisma.customer.count({ where })
        ]);
        
        res.status(200).json({
            data: customers,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch customers' });
    }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูล Customer เพียงชิ้นเดียวตาม ID
 */
exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id: parseInt(id) },
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.status(200).json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the customer' });
    }
};

/**
 * ฟังก์ชันสำหรับแก้ไขข้อมูล Customer
 */
exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerCode, name, phone, address } = req.body;
        const updatedCustomer = await prisma.customer.update({
            where: { id: parseInt(id) },
            data: { customerCode, name, phone, address },
        });
        res.status(200).json(updatedCustomer);
    } catch (error) {
        res.status(500).json({ error: 'Could not update the customer' });
    }
};

/**
 * ฟังก์ชันสำหรับลบ Customer
 */
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.customer.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send(); // No Content
    } catch (error) {
        res.status(500).json({ error: 'Could not delete the customer' });
    }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูลการขายทั้งหมดของลูกค้าคนเดียว
 */
exports.getCustomerSales = async (req, res) => {
    const { id } = req.params;
    try {
        const sales = await prisma.sale.findMany({
            where: {
                customerId: parseInt(id),
            },
            include: {
                itemsSold: {
                    include: {
                        productModel: true,
                    },
                },
            },
            orderBy: {
                saleDate: 'desc',
            },
        });

        if (!sales) {
            return res.status(404).json({ error: 'No sales found for this customer.' });
        }

        res.status(200).json(sales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch customer sales history.' });
    }
};