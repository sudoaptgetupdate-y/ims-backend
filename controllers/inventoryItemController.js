// controllers/inventoryItemController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.addInventoryItem = async (req, res) => {
    try {
        const { serialNumber, macAddress, productModelId } = req.body;
        const userId = req.user.id;

        const newItem = await prisma.inventoryItem.create({
            data: {
                serialNumber: serialNumber || null,
                macAddress: macAddress || null,
                productModelId,
                addedById: userId,
            },
        });
        res.status(201).json(newItem);
    } catch (error) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta.target) 
                ? error.meta.target.join(', ') 
                : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not add the item to inventory' });
    }
};

exports.getAllInventoryItems = async (req, res) => {
    try {
        if (req.query.all === 'true') {
            const searchTerm = req.query.search || '';
            
            const where = { 
                status: 'IN_STOCK'
            };

            if (searchTerm) {
                where.OR = [
                    { serialNumber: { contains: searchTerm } },
                    { macAddress: { equals: searchTerm } },
                    { productModel: { modelNumber: { contains: searchTerm } } }
                ];
            }

            const allItems = await prisma.inventoryItem.findMany({
                 where,
                 include: {
                    productModel: {
                        include: {
                            brand: true,
                            category: true
                        }
                    }
                 },
                 orderBy: {
                    updatedAt: 'desc'
                 }
            });
            return res.status(200).json(allItems);
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';

        let where = {};
        if (searchTerm) {
            where.OR = [
                { serialNumber: { contains: searchTerm } },
                { macAddress: { equals: searchTerm } },
                { productModel: { modelNumber: { contains: searchTerm } } }
            ];
        }
        if (statusFilter && statusFilter !== 'All') {
            where.status = statusFilter;
        }

        const [items, totalItems] = await prisma.$transaction([
            prisma.inventoryItem.findMany({
                where,
                skip: skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    productModel: { include: { category: true, brand: true } },
                    addedBy: { select: { name: true } }
                }
            }),
            prisma.inventoryItem.count({ where })
        ]);

        res.status(200).json({
            data: items,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch inventory items' });
    }
};

exports.getInventoryItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await prisma.inventoryItem.findUnique({
            where: { id: parseInt(id) },
            include: { productModel: true }
        });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the item' });
    }
};

exports.updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { serialNumber, macAddress, status, productModelId } = req.body; 
        const updatedItem = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: { 
                serialNumber: serialNumber || null, 
                macAddress: macAddress || null, 
                status,
                productModelId
            },
        });
        res.status(200).json(updatedItem);
    } catch (error) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta.target) 
                ? error.meta.target.join(', ') 
                : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        res.status(500).json({ error: 'Could not update the item' });
    }
};

// --- START: ส่วนที่แก้ไข ---
exports.deleteInventoryItem = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. ค้นหาสินค้าและสถานะก่อนทำการลบ
        const itemToDelete = await prisma.inventoryItem.findUnique({
            where: { id: parseInt(id) },
        });

        if (!itemToDelete) {
            return res.status(404).json({ error: 'Item not found.' });
        }

        // 2. ตรวจสอบสถานะ: ถ้าถูกขายหรือยืมไปแล้ว ไม่อนุญาตให้ลบ
        if (itemToDelete.status === 'SOLD' || itemToDelete.status === 'BORROWED') {
            return res.status(400).json({ error: `Cannot delete item because its status is '${itemToDelete.status}'.` });
        }

        // 3. ถ้าสถานะปลอดภัย จึงทำการลบ
        await prisma.inventoryItem.delete({
            where: { id: parseInt(id) },
        });

        res.status(204).send();
    } catch (error) {
        // ดักจับ error อื่นๆ จาก Prisma เผื่อไว้
        if (error.code === 'P2003') { // Foreign key constraint
             return res.status(400).json({ error: 'This item cannot be deleted as it is referenced elsewhere.' });
        }
        console.error("Delete Item Error:", error);
        res.status(500).json({ error: 'Could not delete the item.' });
    }
};
// --- END ---