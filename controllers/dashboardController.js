// controllers/dashboardController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDashboardStats = async (req, res) => {
    try {
        // --- START: แก้ไขส่วนการคำนวณ Total Revenue ---

        // 1. ดึงรายการสินค้าที่ขายไปแล้วทั้งหมด พร้อมราคาจาก ProductModel
        const soldItems = await prisma.inventoryItem.findMany({
            where: { status: 'SOLD' },
            include: {
                productModel: {
                    select: {
                        sellingPrice: true,
                    },
                },
            },
        });

        // 2. คำนวณ Total Revenue ด้วย JavaScript
        const totalRevenue = soldItems.reduce((sum, item) => {
            return sum + (item.productModel?.sellingPrice || 0);
        }, 0);

        // --- END: แก้ไขส่วนการคำนวณ Total Revenue ---


        // 3. คำนวณ Stat Cards อื่นๆ (ส่วนนี้เหมือนเดิม)
        const itemsInStock = await prisma.inventoryItem.count({
            where: { status: 'IN_STOCK' },
        });

        // 4. ข้อมูลสำหรับกราฟ (ยอดขาย 7 วันล่าสุด) (ส่วนนี้เหมือนเดิม)
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

        // 5. ข้อมูลรายการขายล่าสุด (ส่วนนี้เหมือนเดิม)
        const recentSales = await prisma.sale.findMany({
            take: 5,
            orderBy: { saleDate: 'desc' },
            include: {
                customer: { select: { name: true } },
                itemsSold: { include: { productModel: true } }
            },
        });

        // 6. ข้อมูลสรุปสต็อก (ส่วนนี้เหมือนเดิม)
        const stockStatus = await prisma.inventoryItem.groupBy({
            by: ['status'],
            _count: { id: true },
        });

        // ส่งข้อมูลทั้งหมดกลับไป
        res.status(200).json({
            totalRevenue, // ใช้ค่าที่คำนวณใหม่
            itemsInStock,
            salesChartData,
            recentSales,
            stockStatus,
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ error: 'Could not fetch dashboard statistics.' });
    }
};

// ฟังก์ชันใหม่สำหรับ Employee Dashboard
exports.getEmployeeDashboardStats = async (req, res) => {
    try {
        // --- ดึงข้อมูลเฉพาะที่ Employee ควรเห็น ---

        // 1. จำนวนสินค้าในสต็อก
        const itemsInStock = await prisma.inventoryItem.count({
            where: { status: 'IN_STOCK' },
        });
        
        // 2. จำนวนสินค้าชำรุด
        const defectiveItems = await prisma.inventoryItem.count({
            where: { status: 'DEFECTIVE' },
        });

        // 3. รายการขายล่าสุด (อาจจะไม่แสดงราคา)
        const recentSales = await prisma.sale.findMany({
            take: 5,
            orderBy: { saleDate: 'desc' },
            include: {
                customer: { select: { name: true } },
                itemsSold: { select: { id: true } } // ดึงแค่จำนวน ไม่ต้องดึงราคา
            },
        });

        // ส่งข้อมูลเฉพาะส่วนของ Employee กลับไป
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