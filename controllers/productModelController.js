// controllers/productModelController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- Create a new Product Model ---
exports.createProductModel = async (req, res) => {
    try {
        const { modelNumber, description, sellingPrice, categoryId, brandId } = req.body;
        const userId = req.user.id;

        const newProductModel = await prisma.productModel.create({
            data: {
                modelNumber,
                description,
                sellingPrice,
                categoryId,
                brandId,
                createdById: userId,
            },
        });
        res.status(201).json(newProductModel);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This model number already exists for this brand.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not create the product model' });
    }
};

// --- Get all Product Models (Paginated or All) ---
exports.getAllProductModels = async (req, res) => {
    try {
        // This is the include object we will reuse to ensure consistency
        const includeRelations = {
            category: true,
            brand: true,
            createdBy: {
                select: { id: true, name: true }
            }
        };

        // --- Branch for "all=true" requests (for dropdowns) ---
        if (req.query.all === 'true') {
            const allProductModels = await prisma.productModel.findMany({
                orderBy: { modelNumber: 'asc' },
                include: includeRelations // Ensure relations are included here too
            });
            return res.status(200).json(allProductModels);
        }

        // --- Branch for Paginated requests (for tables) ---
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm
            ? {
                OR: [
                    { modelNumber: { contains: searchTerm } },
                    { description: { contains: searchTerm } },
                    { brand: { name: { contains: searchTerm } } },
                ]
            }
            : {};
        
        const [productModels, totalItems] = await prisma.$transaction([
            prisma.productModel.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: includeRelations // Use the consistent include object
            }),
            prisma.productModel.count({ where })
        ]);

        res.status(200).json({
            data: productModels,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch product models' });
    }
};

// --- Get a single Product Model by ID ---
exports.getProductModelById = async (req, res) => {
    try {
        const { id } = req.params;
        const productModel = await prisma.productModel.findUnique({
            where: { id: parseInt(id) },
            include: { 
                category: true, 
                brand: true,
                createdBy: { select: { id: true, name: true } }
            }
        });

        if (!productModel) {
            return res.status(404).json({ error: 'Product Model not found' });
        }
        res.status(200).json(productModel);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the product model' });
    }
};

// --- Update a Product Model ---
exports.updateProductModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { modelNumber, description, sellingPrice, categoryId, brandId } = req.body;

        const updatedProductModel = await prisma.productModel.update({
            where: { id: parseInt(id) },
            data: {
                modelNumber,
                description,
                sellingPrice,
                categoryId: parseInt(categoryId, 10),
                brandId: parseInt(brandId, 10),
            },
        });
        res.status(200).json(updatedProductModel);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This model number already exists for this brand.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not update the product model' });
    }
};

// --- Delete a Product Model ---
exports.deleteProductModel = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.productModel.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send();
    } catch (error) {
         if (error.code === 'P2003') { // Foreign key constraint failed
            return res.status(400).json({ error: 'Cannot delete this model because it is linked to inventory items.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not delete the product model' });
    }
};