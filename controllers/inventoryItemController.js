// controllers/inventoryItemController.js
const { PrismaClient, ItemType } = require('@prisma/client');
const prisma = new PrismaClient();
const inventoryItemController = {};

inventoryItemController.addInventoryItem = async (req, res) => {
    try {
        const { serialNumber, macAddress, productModelId, itemType, assetCode } = req.body;
        const userId = req.user.id;

        const newItem = await prisma.inventoryItem.create({
            data: {
                itemType: itemType || ItemType.SALE,
                assetCode: itemType === 'ASSET' ? assetCode : null,
                serialNumber: serialNumber || null,
                macAddress: macAddress || null,
                productModelId,
                addedById: userId,
                status: itemType === 'ASSET' ? 'IN_WAREHOUSE' : 'IN_STOCK',
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

inventoryItemController.getAllInventoryItems = async (req, res) => {
    try {
        if (req.query.all === 'true') {
            const allItems = await prisma.inventoryItem.findMany({
                 where: { status: 'IN_STOCK', itemType: ItemType.SALE },
                 include: {
                    productModel: {
                        include: { brand: true, category: true }
                    },
                 },
                 orderBy: { updatedAt: 'desc' }
            });
            return res.status(200).json(allItems);
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';
        const itemTypeFilter = req.query.itemType;

        let where = {};
        
        if (itemTypeFilter) {
            where.itemType = itemTypeFilter;
        }

        if (searchTerm) {
            where.OR = [
                { serialNumber: { contains: searchTerm } },
                { macAddress: { equals: searchTerm } },
                { productModel: { modelNumber: { contains: searchTerm } } },
                { assetCode: { contains: searchTerm } },
                { assignmentRecords: { some: { assignment: { assignee: { name: { contains: searchTerm } } } } } }
            ];
        }
        if (statusFilter && statusFilter !== 'All') {
            where.status = statusFilter;
        }

        const include = {
            productModel: { include: { category: true, brand: true } },
            addedBy: { select: { name: true } },
        };

        if (itemTypeFilter === 'ASSET') {
            include.assignmentRecords = {
                where: { returnedAt: null },
                include: { assignment: { include: { assignee: { select: { name: true } } } } }
            };
        } else { // Default to SALE
            include.borrowingRecords = {
                where: { returnedAt: null },
                select: { borrowingId: true }
            };
        }

        const [items, totalItems] = await prisma.$transaction([
            prisma.inventoryItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include
            }),
            prisma.inventoryItem.count({ where })
        ]);

        const formattedItems = items.map(item => {
            if (item.itemType === 'ASSET') {
                const currentHolder = item.assignmentRecords[0]?.assignment.assignee.name || null;
                const { assignmentRecords, ...restOfItem } = item;
                return { ...restOfItem, assignedTo: { name: currentHolder } };
            } else {
                const activeBorrowing = item.borrowingRecords.length > 0 ? item.borrowingRecords[0] : null;
                const { borrowingRecords, ...restOfItem } = item;
                return { ...restOfItem, borrowingId: activeBorrowing ? activeBorrowing.borrowingId : null };
            }
        });

        res.status(200).json({
            data: formattedItems,
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

inventoryItemController.getInventoryItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await prisma.inventoryItem.findUnique({
            where: { id: parseInt(id) },
            include: { 
                productModel: {
                    include: {
                        category: true,
                        brand: true
                    }
                },
                addedBy: { select: { name: true } },
                assignmentRecords: {
                     where: { returnedAt: null },
                      include: {
                          assignment: {
                              include: {
                                  assignee: { select: { name: true } }
                              }
                          }
                      }
                }
            }
        });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        const currentHolder = item.assignmentRecords[0]?.assignment.assignee.name || null;
        const finalItem = { ...item, assignedTo: { name: currentHolder } };

        res.status(200).json(finalItem);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the item' });
    }
};

inventoryItemController.updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { assetCode, serialNumber, macAddress, status, productModelId } = req.body; 
        const updatedItem = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: { 
                assetCode,
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

inventoryItemController.deleteInventoryItem = async (req, res) => {
    const { id } = req.params;
    try {
        const itemToDelete = await prisma.inventoryItem.findUnique({
            where: { id: parseInt(id) },
            include: {
                borrowingRecords: {
                    where: { returnedAt: null }
                },
                assignmentRecords: {
                    where: { returnedAt: null }
                }
            }
        });

        if (!itemToDelete) {
            return res.status(404).json({ error: 'Item not found.' });
        }
        
        if (itemToDelete.status === 'SOLD' || itemToDelete.borrowingRecords.length > 0 || itemToDelete.assignmentRecords.length > 0) {
            let reason = 'in use';
            if (itemToDelete.status === 'SOLD') reason = 'SOLD';
            if (itemToDelete.borrowingRecords.length > 0) reason = 'actively BORROWED';
            if (itemToDelete.assignmentRecords.length > 0) reason = 'actively ASSIGNED';
            return res.status(400).json({ error: `Cannot delete item. It is currently ${reason}.` });
        }
        
        await prisma.$transaction(async (tx) => {
            await tx.borrowingOnItems.deleteMany({
                where: { inventoryItemId: parseInt(id) }
            });
             await tx.assetAssignmentOnItems.deleteMany({
                where: { inventoryItemId: parseInt(id) }
            });
             await tx.assetHistory.deleteMany({
                where: { inventoryItemId: parseInt(id) }
            });
            await tx.inventoryItem.delete({
                where: { id: parseInt(id) },
            });
        });

        res.status(204).send();
    } catch (error) {
        console.error("Delete Item Error:", error);
        res.status(500).json({ error: 'Could not delete the item.' });
    }
};

inventoryItemController.getAssetHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const history = await prisma.assetHistory.findMany({
            where: { inventoryItemId: parseInt(id) },
            include: {
                assignedTo: { select: { name: true } }
            },
            orderBy: {
                assignedAt: 'desc'
            }
        });
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch asset history.' });
    }
};

module.exports = inventoryItemController;