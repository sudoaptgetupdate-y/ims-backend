// controllers/borrowingController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const borrowingController = {};

borrowingController.createBorrowing = async (req, res) => {
    const { customerId, inventoryItemIds, dueDate, notes } = req.body;
    const approvedById = req.user.id;

    if (!customerId || !inventoryItemIds || inventoryItemIds.length === 0) {
        return res.status(400).json({ error: 'Customer ID and at least one Item ID are required.' });
    }

    try {
        const newBorrowing = await prisma.$transaction(async (tx) => {
            const itemsToBorrow = await tx.inventoryItem.findMany({
                where: { id: { in: inventoryItemIds }, status: 'IN_STOCK' }
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
            
            await tx.borrowingOnItems.createMany({
                data: inventoryItemIds.map(itemId => ({
                    borrowingId: createdBorrowing.id,
                    inventoryItemId: itemId,
                })),
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: { status: 'BORROWED' },
            });

            return tx.borrowing.findUnique({
                where: { id: createdBorrowing.id },
                include: {
                    borrower: true,
                    approvedBy: { select: { id: true, name: true } },
                    items: { include: { inventoryItem: { include: { productModel: true } } } }
                }
            });
        });

        res.status(201).json(newBorrowing);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Could not complete the borrowing process.' });
    }
};

borrowingController.returnItems = async (req, res) => {
    const { borrowingId } = req.params;
    const { itemIdsToReturn } = req.body;

    if (!itemIdsToReturn || itemIdsToReturn.length === 0) {
         return res.status(400).json({ error: 'At least one Item ID is required to return.' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.borrowingOnItems.updateMany({
                where: {
                    borrowingId: parseInt(borrowingId),
                    inventoryItemId: { in: itemIdsToReturn },
                },
                data: { returnedAt: new Date() },
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: itemIdsToReturn } },
                data: { status: 'IN_STOCK' },
            });

            const remainingItems = await tx.borrowingOnItems.count({
                where: {
                    borrowingId: parseInt(borrowingId),
                    returnedAt: null
                }
            });

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

borrowingController.getAllBorrowings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [borrowings, totalItems] = await prisma.$transaction([
            prisma.borrowing.findMany({
                skip,
                take: limit,
                orderBy: { borrowDate: 'desc' },
                include: {
                    borrower: { select: { id: true, name: true } },
                    approvedBy: { select: { id: true, name: true } },
                    items: {
                        select: {
                            returnedAt: true
                        }
                    }
                }
            }),
            prisma.borrowing.count()
        ]);
        
        const formattedBorrowings = borrowings.map(b => {
            const totalItemCount = b.items.length;
            const returnedItemCount = b.items.filter(item => item.returnedAt !== null).length;
            const { items, ...rest } = b;
            return {
                ...rest,
                totalItemCount,
                returnedItemCount
            };
        });

        res.status(200).json({
            data: formattedBorrowings,
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

borrowingController.getBorrowingById = async (req, res) => {
    try {
        const { borrowingId } = req.params;
        
        const id = parseInt(borrowingId);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid Borrowing ID provided." });
        }

        const borrowing = await prisma.borrowing.findUnique({
            where: { id: id },
            include: {
                borrower: true,
                approvedBy: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        inventoryItem: {
                            include: {
                                productModel: {
                                    include: { brand: true, category: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!borrowing) {
            return res.status(404).json({ error: 'Borrowing record not found' });
        }

        const formattedBorrowing = {
            ...borrowing,
            items: borrowing.items.map(boi => ({
                ...boi.inventoryItem,
                returnedAt: boi.returnedAt,
                borrowingId: boi.borrowingId 
            }))
        };
        
        res.status(200).json(formattedBorrowing);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch the borrowing record.' });
    }
};

module.exports = borrowingController;