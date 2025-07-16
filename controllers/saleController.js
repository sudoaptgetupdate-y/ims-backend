// controllers/saleController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * ฟังก์ชันสำหรับสร้างรายการขายใหม่ (Transaction)
 */
exports.createSale = async (req, res) => {
    // 1. ดึงข้อมูลจาก request body
    const { customerId, inventoryItemIds } = req.body;
    const soldById = req.user.id; 

    if (!customerId || !inventoryItemIds || inventoryItemIds.length === 0) {
        return res.status(400).json({ error: 'Customer ID and at least one Item ID are required.' });
    }

    try {
        // 2. เริ่ม Transaction
        const sale = await prisma.$transaction(async (tx) => {
            // 2.1 ดึงราคาสินค้าทั้งหมดที่จะขาย (จาก ProductModel)
            const itemsToSell = await tx.inventoryItem.findMany({
                where: { 
                    id: { in: inventoryItemIds },
                    status: 'IN_STOCK' 
                },
                include: { productModel: { select: { sellingPrice: true } } },
            });

            // ตรวจสอบว่าสินค้าทุกชิ้นพร้อมขายและมีข้อมูลครบถ้วน
            if (itemsToSell.length !== inventoryItemIds.length) {
                throw new Error('One or more items are not available for sale or not found.');
            }

            // --- START: Logic การคำนวณ VAT ---
            const subtotal = itemsToSell.reduce((sum, item) => sum + (item.productModel?.sellingPrice || 0), 0);
            const vatAmount = subtotal * 0.07;
            const total = subtotal + vatAmount;
            // --- END ---

            // 2.2 สร้างรายการขาย (Sale) พร้อมบันทึกค่าที่คำนวณใหม่
            const newSale = await tx.sale.create({
                data: {
                    customerId,
                    soldById,
                    subtotal,  // บันทึกราคารวมก่อน VAT
                    vatAmount, // บันทึกยอดภาษี
                    total,     // บันทึกราคารวมสุทธิ
                },
            });

            // 2.3 อัปเดตสถานะของสินค้าทุกชิ้นในรายการขาย
            const updatedItems = await tx.inventoryItem.updateMany({
                where: {
                    id: { in: inventoryItemIds },
                },
                data: {
                    status: 'SOLD',
                    saleId: newSale.id,
                },
            });

            // ถ้าจำนวน item ที่อัปเดตได้ ไม่ตรงกับจำนวนที่ส่งมา แสดงว่ามีบางชิ้นไม่พร้อมขาย (ตรวจสอบอีกครั้งเพื่อความปลอดภัย)
            if (updatedItems.count !== inventoryItemIds.length) {
                throw new Error('One or more items could not be updated to SOLD status.');
            }

            // 2.4 ดึงข้อมูล Sale ที่สมบูรณ์กลับไป (เพื่อแสดงผล)
            const completeSale = await tx.sale.findUnique({
                where: { id: newSale.id },
                include: { 
                    customer: true, 
                    soldBy: { select: { name: true } },
                    itemsSold: { include: { productModel: true } } 
                }
            });
            
            return completeSale;
        });

        // 3. ถ้า Transaction สำเร็จ ให้ส่งข้อมูลกลับไป
        res.status(201).json(sale);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Could not complete the sale.' });
    }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูลการขายทั้งหมด
 */
exports.getAllSales = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm
            ? {
                OR: [
                    { customer: { name: { contains: searchTerm } } },
                    { soldBy: { name: { contains: searchTerm } } }
                ]
            }
            : {};
        
        const [sales, totalItems] = await prisma.$transaction([
            prisma.sale.findMany({
                where,
                skip,
                take: limit,
                orderBy: { saleDate: 'desc' },
                include: {
                    customer: true,
                    soldBy: { select: { id: true, name: true } },
                    itemsSold: { include: { productModel: true } }
                }
            }),
            prisma.sale.count({ where })
        ]);
        
        // --- ส่วนที่สำคัญที่สุด ---
        // ต้องส่งข้อมูลกลับในรูปแบบ Object ที่มี key ชื่อ data และ pagination
        res.status(200).json({
            data: sales,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch sales.' });
    }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูลการขายตาม ID
 */
exports.getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await prisma.sale.findUnique({
            where: { id: parseInt(id) },
            include: {
                customer: true,
                soldBy: { select: { id: true, name: true, email: true } },
                itemsSold: {
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

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        res.status(200).json(sale);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch the sale.' });
    }
};

/**
 * ฟังก์ชันสำหรับลบการขาย (Transaction)
 * หมายเหตุ: ควรพิจารณาว่าการลบการขายมีผลกระทบต่อรายงานทางการเงินหรือไม่
 */
exports.deleteSale = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedSale = await prisma.$transaction(async (tx) => {
            const saleToDelete = await tx.sale.findUnique({
                where: { id: parseInt(id) },
                include: { itemsSold: true },
            });

            if (!saleToDelete) {
                throw new Error('Sale not found.');
            }

            const itemIdsToUpdate = saleToDelete.itemsSold.map(item => item.id);

            if (itemIdsToUpdate.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: itemIdsToUpdate } },
                    data: {
                        status: 'IN_STOCK',
                        saleId: null,
                    },
                });
            }

            await tx.sale.delete({
                where: { id: parseInt(id) },
            });

            return saleToDelete;
        });

        res.status(204).send();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Could not delete the sale.' });
    }
};

/**
 * ฟังก์ชันสำหรับอัปเดตการขาย (Transaction)
 * หมายเหตุ: การอัปเดตการขายควรคำนวณ VAT ใหม่ทุกครั้ง
 */
exports.updateSale = async (req, res) => {
    const { id } = req.params;
    const { customerId, inventoryItemIds } = req.body;

    try {
        const updatedSale = await prisma.$transaction(async (tx) => {
            // 1. ดึงข้อมูลการขายเดิมและสินค้าทั้งหมดที่เกี่ยวข้อง
            const originalSale = await tx.sale.findUnique({
                where: { id: parseInt(id) },
                include: { itemsSold: true },
            });

            if (!originalSale) {
                throw new Error("Sale not found.");
            }
            
            // 2. คืนสถานะสินค้าเก่าทั้งหมดที่เคยอยู่ในบิล ให้กลับไปเป็น IN_STOCK ก่อน
            const originalItemIds = originalSale.itemsSold.map(item => item.id);
            if (originalItemIds.length > 0) {
                 await tx.inventoryItem.updateMany({
                    where: { id: { in: originalItemIds } },
                    data: { status: 'IN_STOCK', saleId: null },
                });
            }

            // 3. ดึงข้อมูลสินค้าชุดใหม่และคำนวณ VAT
             const itemsToSell = await tx.inventoryItem.findMany({
                where: { id: { in: inventoryItemIds } },
                include: { productModel: { select: { sellingPrice: true } } },
            });
            if (itemsToSell.length !== inventoryItemIds.length) {
                throw new Error('One or more new items are not available for sale.');
            }
            const subtotal = itemsToSell.reduce((sum, item) => sum + (item.productModel?.sellingPrice || 0), 0);
            const vatAmount = subtotal * 0.07;
            const total = subtotal + vatAmount;


            // 4. อัปเดตสินค้าชุดใหม่ให้เป็น SOLD และผูกกับ Sale ID นี้
            if (inventoryItemIds.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: inventoryItemIds } },
                    data: { status: 'SOLD', saleId: parseInt(id) },
                });
            }

            // 5. อัปเดตข้อมูลหลักของ Sale
            const finalSale = await tx.sale.update({
                where: { id: parseInt(id) },
                data: {
                    customerId: customerId,
                    subtotal: subtotal,
                    vatAmount: vatAmount,
                    total: total,
                },
                include: { customer: true, soldBy: true, itemsSold: true },
            });

            return finalSale;
        });

        res.status(200).json(updatedSale);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || "Could not update the sale." });
    }
};