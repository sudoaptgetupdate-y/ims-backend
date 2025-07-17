// controllers/borrowingController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * สร้างรายการยืมใหม่
 */
exports.createBorrowing = async (req, res) => {
    const { customerId, inventoryItemIds, dueDate, notes } = req.body;
    const approvedById = req.user.id;

    if (!customerId || !inventoryItemIds || inventoryItemIds.length === 0) {
        return res.status(400).json({ error: 'Customer ID and at least one Item ID are required.' });
    }

    try {
        const newBorrowing = await prisma.$transaction(async (tx) => {
            const itemsToBorrow = await tx.inventoryItem.findMany({
                where: {
                    id: { in: inventoryItemIds },
                    status: 'IN_STOCK'
                }
            });

            if (itemsToBorrow.length !== inventoryItemIds.length) {
                throw new Error('One or more items are not available or not found.');
            }

            const createdBorrowing = await tx.borrowing.create({
                data: {
                    borrowerId: customerId,
                    approvedById,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    notes,
                    status: 'BORROWED',
                },
            });

            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: {
                    status: 'BORROWED',
                    borrowingId: createdBorrowing.id,
                },
            });

            return tx.borrowing.findUnique({
                where: { id: createdBorrowing.id },
                include: {
                    borrower: true,
                    approvedBy: { select: { id: true, name: true } },
                    items: { include: { productModel: true } }
                }
            });
        });

        res.status(201).json(newBorrowing);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Could not complete the borrowing process.' });
    }
};


/**
 * รับคืนอุปกรณ์ (แก้ไขแล้ว)
 */
exports.returnItems = async (req, res) => {
    const { borrowingId } = req.params;
    const { itemIdsToReturn } = req.body;

    if (!itemIdsToReturn || itemIdsToReturn.length === 0) {
         return res.status(400).json({ error: 'At least one Item ID is required to return.' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // === ส่วนที่แก้ไข ===
            // 1. อัปเดตสถานะของสินค้าที่คืนให้กลับเป็น IN_STOCK
            // **แต่ไม่ลบ borrowingId ออก** เพื่อคงประวัติไว้
            await tx.inventoryItem.updateMany({
                where: {
                    id: { in: itemIdsToReturn },
                    borrowingId: parseInt(borrowingId)
                },
                data: {
                    status: 'IN_STOCK', 
                },
            });

            // 2. ตรวจสอบว่ายังมีสินค้าอื่นที่ยังไม่คืนในรายการยืมนี้หรือไม่
            const remainingItems = await tx.inventoryItem.count({
                where: {
                    borrowingId: parseInt(borrowingId),
                    status: 'BORROWED'
                }
            });

            // 3. ถ้าไม่เหลือสินค้าที่ถูกยืมแล้ว ให้อัปเดตสถานะการยืมเป็น RETURNED
            if (remainingItems === 0) {
                await tx.borrowing.update({
                    where: { id: parseInt(borrowingId) },
                    data: {
                        status: 'RETURNED',
                        returnDate: new Date(),
                    },
                });
            }
        });

        res.status(200).json({ message: 'Items returned successfully.' });

    } catch (error) {
         console.error(error);
        res.status(500).json({ error: error.message || 'Could not process the return.' });
    }
};

/**
 * ดึงข้อมูลการยืมทั้งหมด (พร้อม Pagination)
 */
exports.getAllBorrowings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm ? {
            OR: [
                { borrower: { name: { contains: searchTerm } } },
                { approvedBy: { name: { contains: searchTerm } } },
                { items: { some: { serialNumber: { contains: searchTerm } } } }
            ]
        } : {};
        
        const [borrowings, totalItems] = await prisma.$transaction([
            prisma.borrowing.findMany({
                where,
                skip,
                take: limit,
                orderBy: { borrowDate: 'desc' },
                include: {
                    borrower: { select: { id: true, name: true } },
                    approvedBy: { select: { id: true, name: true } },
                    items: { select: { status: true } }
                }
            }),
            prisma.borrowing.count({ where })
        ]);

        const borrowingsWithItemStatus = borrowings.map(b => {
            const totalItemCount = b.items.length;
            const returnedItemCount = b.items.filter(item => item.status !== 'BORROWED').length;
            const { items, ...rest } = b; 
            return {
                ...rest,
                totalItemCount,
                returnedItemCount
            };
        });

        res.status(200).json({
            data: borrowingsWithItemStatus,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch borrowings.' });
    }
};

/**
 * ดึงข้อมูลการยืมตาม ID
 */
exports.getBorrowingById = async (req, res) => {
    try {
        const { borrowingId } = req.params;
        const borrowing = await prisma.borrowing.findUnique({
            where: { id: parseInt(borrowingId) },
            include: {
                borrower: true,
                approvedBy: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        productModel: {
                            include: {
                                brand: true,
                                category: true
                            }
                        }
                    }
                }
            }
        });

        if (!borrowing) {
            return res.status(404).json({ error: 'Borrowing record not found' });
        }

        res.status(200).json(borrowing);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch the borrowing record.' });
    }
};