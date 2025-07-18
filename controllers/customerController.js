// controllers/customerController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const customerController = {};

customerController.createCustomer = async (req, res) => {
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

customerController.getAllCustomers = async (req, res) => {
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

customerController.getCustomerById = async (req, res) => {
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

customerController.updateCustomer = async (req, res) => {
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

customerController.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.customer.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete this customer because they are linked to sales or borrowing records.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not delete the customer' });
    }
};

customerController.getCustomerHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const sales = await prisma.sale.findMany({
            where: { customerId: parseInt(id) },
            include: { itemsSold: { include: { productModel: true } } },
            orderBy: { saleDate: 'desc' }
        });

        const borrowings = await prisma.borrowing.findMany({
            where: { borrowerId: parseInt(id) },
            include: { 
                items: {
                    include: { inventoryItem: { include: { productModel: true } } }
                }
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

customerController.getCustomerSummary = async (req, res) => {
    const { id } = req.params;
    const customerId = parseInt(id);

    try {
        const purchases = await prisma.sale.findMany({
            where: { customerId, status: 'COMPLETED' },
            include: { itemsSold: { include: { productModel: true } } },
            orderBy: { saleDate: 'desc' }
        });

        const borrowings = await prisma.borrowing.findMany({
            where: { borrowerId: customerId },
            include: {
                items: { 
                    include: {
                        inventoryItem: { include: { productModel: true } }
                    }
                }
            },
            orderBy: { borrowDate: 'desc' }
        });

        const allBorrowedItems = borrowings.flatMap(b =>
            b.items.map(boi => ({
                ...boi.inventoryItem,
                borrowDate: b.borrowDate,
                dueDate: b.dueDate,
                returnedAt: boi.returnedAt,
            }))
        );

        const currentlyBorrowedItems = allBorrowedItems.filter(item => item.returnedAt === null);
        const returnedItemsHistory = allBorrowedItems.filter(item => item.returnedAt !== null);

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

customerController.getActiveBorrowings = async (req, res) => {
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
                    where: { returnedAt: null },
                    include: { 
                        inventoryItem: {
                            include: { productModel: true }
                        }
                    }
                }
            },
            orderBy: { borrowDate: 'asc' },
        });
        
        const formattedActiveBorrowings = activeBorrowings.map(b => ({
            ...b,
            items: b.items.map(i => i.inventoryItem)
        }));

        res.status(200).json(formattedActiveBorrowings);
    } catch (error) {
        console.error("Error fetching active borrowings:", error);
        res.status(500).json({ error: 'Could not fetch active borrowings.' });
    }
};

customerController.getReturnedHistory = async (req, res) => {
    const { id } = req.params;
    const customerId = parseInt(id);

    try {
        const returnedRecords = await prisma.borrowingOnItems.findMany({
            where: {
                borrowing: {
                    borrowerId: customerId,
                },
                returnedAt: {
                    not: null,
                }
            },
            include: {
                inventoryItem: {
                    include: {
                        productModel: true,
                    }
                },
                borrowing: true,
            },
            orderBy: {
                returnedAt: 'desc',
            }
        });
        
        const formattedItems = returnedRecords.map(record => ({
            ...record.inventoryItem,
            returnDate: record.returnedAt,
            borrowDate: record.borrowing.borrowDate,
            transactionId: record.borrowingId,
        }));
        
        res.status(200).json(formattedItems);

    } catch (error) {
        console.error("Error fetching returned history:", error);
        res.status(500).json({ error: 'Could not fetch returned items history.' });
    }
};

customerController.getPurchaseHistory = async (req, res) => {
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

module.exports = customerController;