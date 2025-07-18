// controllers/categoryController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createCategory = async (req, res) => {
    try {
        const { name, requiresMacAddress, requiresSerialNumber } = req.body;

        if (!name || name.trim() === "") {
            return res.status(400).json({ error: 'Name is required and cannot be empty' });
        }

        const newCategory = await prisma.category.create({
            data: {
                name: name,
                requiresMacAddress: requiresMacAddress,
                requiresSerialNumber: requiresSerialNumber,
            },
        });

        res.status(201).json(newCategory);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This category name already exists.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not create the category' });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        if (req.query.all === 'true') {
            const allCategories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
            return res.status(200).json(allCategories);
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm
            ? { name: { contains: searchTerm } }
            : {};

        const [categories, totalItems] = await prisma.$transaction([
            prisma.category.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.category.count({ where })
        ]);
        
        res.status(200).json({
            data: categories,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch categories' });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id: parseInt(id) },
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the category' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, requiresMacAddress, requiresSerialNumber } = req.body;

        if (typeof requiresMacAddress !== 'boolean' || typeof requiresSerialNumber !== 'boolean') {
            return res.status(400).json({ error: 'Invalid data format for switch values.' });
        }

        const updatedCategory = await prisma.category.update({
            where: { id: parseInt(id) },
            data: { 
                name: name,
                requiresMacAddress: requiresMacAddress,
                requiresSerialNumber: requiresSerialNumber,
            },
        });
        res.status(200).json(updatedCategory);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This category name already exists.' });
        }
        console.error("Error updating category:", error);
        res.status(500).json({ error: 'Could not update the category' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete this category because it is being used by product models.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not delete the category' });
    }
};