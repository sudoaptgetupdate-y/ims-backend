// controllers/dashboardController.js
const { PrismaClient, ItemType } = require('@prisma/client'); // --- 1. เพิ่ม ItemType ---
const prisma = new PrismaClient();

exports.getDashboardStats = async (req, res) => {
    try {
        const soldItems = await prisma.inventoryItem.findMany({
            where: { status: 'SOLD', itemType: ItemType.SALE }, // --- 2. กรองเฉพาะของขาย ---
            include: {
                productModel: {
                    select: {
                        sellingPrice: true,
                    },
                },
            },
        });

        const totalRevenue = soldItems.reduce((sum, item) => {
            return sum + (item.productModel?.sellingPrice || 0);
        }, 0);

        const itemsInStock = await prisma.inventoryItem.count({
            where: { status: 'IN_STOCK', itemType: ItemType.SALE }, // --- 3. กรองเฉพาะของขาย ---
        });

        // --- START: 4. เพิ่มการนับข้อมูลทรัพย์สิน ---
        const totalAssets = await prisma.inventoryItem.count({
            where: { itemType: ItemType.ASSET }
        });
        const assignedAssets = await prisma.inventoryItem.count({
            where: { itemType: ItemType.ASSET, status: 'ASSIGNED' }
        });
        // --- END ---

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailySales = await prisma.sale.groupBy({
            by: ['saleDate'],
            _count: { id: true },
            where: { saleDate: { gte: sevenDaysAgo } },
            orderBy: { saleDate: 'asc' },
        });
        
        const salesChartData = dailySales.map(day => ({
            name: new Date(day.saleDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            total: day._count.id,
        }));

        const recentSales = await prisma.sale.findMany({
            take: 5,
            orderBy: { saleDate: 'desc' },
            include: {
                customer: { select: { name: true } },
                itemsSold: { include: { productModel: true } }
            },
        });

        const stockStatus = await prisma.inventoryItem.groupBy({
            where: { itemType: ItemType.SALE }, // --- 5. กรอง Pie Chart ให้แสดงเฉพาะของขาย ---
            by: ['status'],
            _count: { id: true },
        });

        res.status(200).json({
            totalRevenue,
            itemsInStock,
            totalAssets, // --- 6. ส่งข้อมูลใหม่กลับไป ---
            assignedAssets, // --- 6. ส่งข้อมูลใหม่กลับไป ---
            salesChartData,
            recentSales,
            stockStatus,
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ error: 'Could not fetch dashboard statistics.' });
    }
};

// ... (getEmployeeDashboardStats เหมือนเดิม) ...
exports.getEmployeeDashboardStats = async (req, res) => {
    try {
        const itemsInStock = await prisma.inventoryItem.count({
            where: { status: 'IN_STOCK', itemType: ItemType.SALE }, // --- กรองเฉพาะของขาย ---
        });
        
        const defectiveItems = await prisma.inventoryItem.count({
            where: { 
                OR: [
                    { status: 'DEFECTIVE', itemType: ItemType.SALE },
                    { status: 'DEFECTIVE', itemType: ItemType.ASSET },
                ]
            },
        });

        const recentSales = await prisma.sale.findMany({
            take: 5,
            orderBy: { saleDate: 'desc' },
            include: {
                customer: { select: { name: true } },
                itemsSold: { select: { id: true } } 
            },
        });

        res.status(200).json({
            itemsInStock,
            defectiveItems,
            recentSales,
        });

    } catch (error) {
        console.error("Employee Dashboard Error:", error);
        res.status(500).json({ error: 'Could not fetch employee dashboard statistics.' });
    }
};