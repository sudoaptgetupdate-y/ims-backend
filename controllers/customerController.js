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
        if (req.query.all === 'true') {
            const allCustomers = await prisma.customer.findMany({
                orderBy: { name: 'asc' },
                include: { createdBy: { select: { name: true } } }
            });
            return res.status(200).json(allCustomers);
        }

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
 * ดึงประวัติทั้งหมด (การซื้อและการยืม) ของลูกค้าคนเดียว
 */
exports.getCustomerHistory = async (req, res) => {
    const { id } = req.params;

    try {
        const sales = await prisma.sale.findMany({
            where: { customerId: parseInt(id) },
            include: {
                itemsSold: { include: { productModel: true } }
            },
            orderBy: { saleDate: 'desc' }
        });

        const borrowings = await prisma.borrowing.findMany({
            where: { borrowerId: parseInt(id) },
            include: {
                items: { include: { productModel: true } }
            },
            orderBy: { borrowDate: 'desc' }
        });

        const salesHistory = sales.map(sale => ({
            type: 'SALE',
            id: `sale-${sale.id}`,
            date: sale.saleDate,
            itemCount: sale.itemsSold.length,
            details: sale
        }));

        const borrowingHistory = borrowings.map(b => ({
            type: 'BORROWING',
            id: `borrow-${b.id}`,
            date: b.borrowDate,
            itemCount: b.items.length,
            details: b
        }));

        const combinedHistory = [...salesHistory, ...borrowingHistory]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json(combinedHistory);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch customer history.' });
    }
};

/**
 * ดึงข้อมูลสรุป (Summary) ของลูกค้าคนเดียว (ฉบับแก้ไขล่าสุด)
 */
exports.getCustomerSummary = async (req, res) => {
    const { id } = req.params;
    const customerId = parseInt(id);

    try {
        const purchases = await prisma.sale.findMany({
            where: { customerId },
            include: {
                itemsSold: { include: { productModel: true } }
            },
            orderBy: { saleDate: 'desc' }
        });

        const borrowings = await prisma.borrowing.findMany({
            where: { borrowerId: customerId },
            include: {
                items: { include: { productModel: true } }
            },
            orderBy: { borrowDate: 'desc' }
        });

        const allBorrowedItems = borrowings.flatMap(b =>
            b.items.map(item => ({
                ...item,
                borrowDate: b.borrowDate,
                dueDate: b.dueDate,
                returnDate: b.status !== 'BORROWED' ? b.returnDate : null,
            }))
        );

        const currentlyBorrowedItems = allBorrowedItems.filter(item => item.status === 'BORROWED');
        const returnedItemsHistory = allBorrowedItems.filter(item => item.status !== 'BORROWED');

        const purchaseHistory = purchases.flatMap(sale =>
            sale.itemsSold.map(item => ({
                ...item,
                transactionDate: sale.saleDate,
                transactionId: sale.id
            }))
        );

        res.status(200).json({
            purchaseHistory,
            currentlyBorrowedItems,
            returnedItemsHistory
        });

    } catch (error) {
        console.error("Error fetching customer summary:", error);
        res.status(500).json({ error: 'Could not fetch customer summary.' });
    }
};

exports.getActiveBorrowings = async (req, res) => {
    const { id } = req.params;
    const customerId = parseInt(id);

    try {
        const activeBorrowings = await prisma.borrowing.findMany({
            where: {
                borrowerId: customerId,
                status: 'BORROWED',
            },
            include: {
                items: {
                    where: {
                        status: 'BORROWED'
                    },
                    include: {
                        productModel: true,
                    },
                },
            },
            orderBy: {
                borrowDate: 'asc',
            },
        });

        res.status(200).json(activeBorrowings);
    } catch (error) {
        console.error("Error fetching active borrowings:", error);
        res.status(500).json({ error: 'Could not fetch active borrowings.' });
    }
};

// --- START: ส่วนที่แก้ไข ---
exports.getReturnedHistory = async (req, res) => {
    const { id } = req.params;
    const customerId = parseInt(id);

    try {
        // ค้นหารายการสินค้าทั้งหมดที่เคยถูกยืมโดยลูกค้ารายนี้ และตอนนี้ไม่ได้อยู่ในสถานะ 'BORROWED'
        const returnedItems = await prisma.inventoryItem.findMany({
            where: {
                // ต้องมี borrowingId เพื่อยืนยันว่าเคยถูกยืม
                borrowingId: { not: null },
                // การยืมนั้นต้องเป็นของลูกค้ารายนี้
                borrowing: {
                    borrowerId: customerId
                },
                // และสถานะปัจจุบันของสินค้าต้อง *ไม่ใช่* 'BORROWED'
                NOT: {
                    status: 'BORROWED'
                }
            },
            include: {
                // ดึงข้อมูล ProductModel มาเพื่อแสดงผล
                productModel: true,
                // ดึงข้อมูลการยืม (Borrowing) มาเพื่อเอาวันที่คืน (returnDate)
                borrowing: true
            },
            orderBy: {
                // จัดเรียงตามวันที่อัปเดตล่าสุด (ซึ่งก็คือตอนที่สินค้าถูกคืน)
                updatedAt: 'desc'
            }
        });

        // จัดรูปแบบข้อมูลให้ตรงกับที่ Frontend คาดหวัง
        const formattedItems = returnedItems.map(item => {
            const { borrowing, ...restOfItem } = item;
            return {
                ...restOfItem,
                productModel: item.productModel,
                // ใช้ returnDate จาก transaction การยืมหลัก
                returnDate: borrowing.returnDate,
                // transactionId คือ ID ของใบยืม
                transactionId: borrowing.id
            };
        });

        res.status(200).json(formattedItems);

    } catch (error) {
        console.error("Error fetching returned history:", error);
        res.status(500).json({ error: 'Could not fetch returned items history.' });
    }
};
// --- END: ส่วนที่แก้ไข ---

/**
 * ดึงประวัติอุปกรณ์ที่เคยซื้อทั้งหมด
 */
exports.getPurchaseHistory = async (req, res) => {
    const { id } = req.params;
    const customerId = parseInt(id);

    try {
        const sales = await prisma.sale.findMany({
            where: { customerId },
            include: {
                itemsSold: {
                    include: { productModel: true }
                }
            },
            orderBy: { saleDate: 'desc' }
        });

        // คลี่ข้อมูลออกมาเป็นรายชิ้น
        const purchasedItems = sales.flatMap(s => 
            s.itemsSold.map(item => ({
                ...item,
                purchaseDate: s.saleDate,
                transactionId: s.id
            }))
        );

        res.status(200).json(purchasedItems);

    } catch (error) {
        console.error("Error fetching purchase history:", error);
        res.status(500).json({ error: 'Could not fetch purchase history.' });
    }
};