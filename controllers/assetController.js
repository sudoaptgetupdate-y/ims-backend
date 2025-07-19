// controllers/assetController.js
const { PrismaClient, ItemType, ItemStatus } = require('@prisma/client');
const prisma = new PrismaClient();

const assetController = {};

// Get all assets
assetController.getAllAssets = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';

        let where = {
            itemType: ItemType.ASSET
        };
        
        if (searchTerm) {
            where.OR = [
                { assetCode: { contains: searchTerm } },
                { serialNumber: { contains: searchTerm } },
                { productModel: { modelNumber: { contains: searchTerm } } },
                { assignedTo: { name: { contains: searchTerm } } }
            ];
        }

        if (statusFilter && statusFilter !== 'All') {
            where.status = statusFilter;
        }

        const [assets, totalItems] = await prisma.$transaction([
            prisma.inventoryItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    productModel: { include: { category: true, brand: true } },
                    addedBy: { select: { name: true } },
                    assignedTo: { select: { name: true } }
                }
            }),
            prisma.inventoryItem.count({ where })
        ]);

        res.status(200).json({
            data: assets,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error("Error fetching assets:", error);
        res.status(500).json({ error: 'Could not fetch assets.' });
    }
};

// Add new asset
assetController.addAsset = async (req, res) => {
    try {
        const { assetCode, serialNumber, macAddress, productModelId } = req.body;
        const userId = req.user.id;

        const newItem = await prisma.inventoryItem.create({
            data: {
                itemType: ItemType.ASSET,
                status: ItemStatus.IN_WAREHOUSE,
                assetCode,
                serialNumber: serialNumber || null,
                macAddress: macAddress || null,
                productModelId,
                addedById: userId,
            },
        });
        res.status(201).json(newItem);
    } catch (error) {
        if (error.code === 'P2002') {
             const target = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not add the asset.' });
    }
};

// Assign an asset to a user
assetController.assignAsset = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const updatedAsset = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: {
                assignedToId: parseInt(userId),
                status: ItemStatus.ASSIGNED
            }
        });
        res.status(200).json(updatedAsset);
    } catch (error) {
        console.error("Error assigning asset:", error);
        res.status(500).json({ error: 'Could not assign asset.' });
    }
};

// Return an asset to warehouse
assetController.returnAsset = async (req, res) => {
    const { id } = req.params;
    try {
        const updatedAsset = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: {
                assignedToId: null,
                status: ItemStatus.IN_WAREHOUSE
            }
        });
        res.status(200).json(updatedAsset);
    } catch (error) {
        console.error("Error returning asset:", error);
        res.status(500).json({ error: 'Could not return asset.' });
    }
};

// Decommission an asset
assetController.decommissionAsset = async (req, res) => {
    const { id } = req.params;
    try {
        const updatedAsset = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: {
                assignedToId: null,
                status: ItemStatus.DECOMMISSIONED
            }
        });
        res.status(200).json(updatedAsset);
    } catch (error) {
        console.error("Error decommissioning asset:", error);
        res.status(500).json({ error: 'Could not decommission asset.' });
    }
};

module.exports = assetController;