// controllers/assetAssignmentController.js
const { PrismaClient, ItemType, ItemStatus, AssignmentStatus } = require('@prisma/client');
const prisma = new PrismaClient();

const assetAssignmentController = {};

// ... (createAssignment, returnItems functions are the same) ...
assetAssignmentController.createAssignment = async (req, res) => {
    const { assigneeId, inventoryItemIds, notes } = req.body;
    const approvedById = req.user.id;

    if (!assigneeId || !inventoryItemIds || inventoryItemIds.length === 0) {
        return res.status(400).json({ error: 'Assignee ID and at least one Item ID are required.' });
    }

    try {
        const newAssignment = await prisma.$transaction(async (tx) => {
            const itemsToAssign = await tx.inventoryItem.findMany({
                where: { 
                    id: { in: inventoryItemIds }, 
                    status: 'IN_WAREHOUSE',
                    itemType: 'ASSET'
                }
            });

            if (itemsToAssign.length !== inventoryItemIds.length) {
                throw new Error('One or more assets are not available or not found in the warehouse.');
            }

            const createdAssignment = await tx.assetAssignment.create({
                data: {
                    assigneeId,
                    approvedById,
                    notes,
                    status: 'ASSIGNED',
                },
            });
            
            await tx.assetAssignmentOnItems.createMany({
                data: inventoryItemIds.map(itemId => ({
                    assignmentId: createdAssignment.id,
                    inventoryItemId: itemId,
                })),
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: { status: 'ASSIGNED' },
            });

            await tx.assetHistory.createMany({
                data: inventoryItemIds.map(itemId => ({
                    inventoryItemId: itemId,
                    assignedToId: assigneeId,
                }))
            });

            return createdAssignment;
        });

        res.status(201).json(newAssignment);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Could not complete the assignment process.' });
    }
};

assetAssignmentController.returnItems = async (req, res) => {
    const { assignmentId } = req.params;
    const { itemIdsToReturn } = req.body;

    if (!itemIdsToReturn || itemIdsToReturn.length === 0) {
         return res.status(400).json({ error: 'At least one Item ID is required to return.' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.assetAssignmentOnItems.updateMany({
                where: {
                    assignmentId: parseInt(assignmentId),
                    inventoryItemId: { in: itemIdsToReturn },
                },
                data: { returnedAt: new Date() },
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: itemIdsToReturn } },
                data: { status: 'IN_WAREHOUSE' },
            });

            await tx.assetHistory.updateMany({
                where: {
                    inventoryItemId: { in: itemIdsToReturn },
                    returnedAt: null
                },
                data: {
                    returnedAt: new Date()
                }
            });

            const remainingItems = await tx.assetAssignmentOnItems.count({
                where: {
                    assignmentId: parseInt(assignmentId),
                    returnedAt: null
                }
            });

            let newStatus = remainingItems === 0 ? AssignmentStatus.RETURNED : AssignmentStatus.PARTIALLY_RETURNED;
            
            await tx.assetAssignment.update({
                where: { id: parseInt(assignmentId) },
                data: {
                    status: newStatus,
                    returnDate: newStatus === AssignmentStatus.RETURNED ? new Date() : null,
                },
            });
        });

        res.status(200).json({ message: 'Assets returned successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Could not process the return.' });
    }
};


// --- START: ส่วนที่แก้ไข ---
assetAssignmentController.getAllAssignments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [assignments, totalItems] = await prisma.$transaction([
            prisma.assetAssignment.findMany({
                skip,
                take: limit,
                orderBy: { assignedDate: 'desc' },
                include: {
                    assignee: { select: { id: true, name: true } },
                    approvedBy: { select: { id: true, name: true } },
                    items: { // ดึงข้อมูล items เพื่อมานับ
                        select: {
                            returnedAt: true
                        }
                    }
                }
            }),
            prisma.assetAssignment.count()
        ]);
        
        // จัดรูปแบบข้อมูลใหม่เพื่อเพิ่มจำนวน item
        const formattedAssignments = assignments.map(a => {
            const totalItemCount = a.items.length;
            const returnedItemCount = a.items.filter(item => item.returnedAt !== null).length;
            const { items, ...rest } = a;
            return {
                ...rest,
                totalItemCount,
                returnedItemCount
            };
        });

        res.status(200).json({
            data: formattedAssignments,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch assignments.' });
    }
};
// --- END ---

assetAssignmentController.getAssignmentById = async (req, res) => {
    const { assignmentId } = req.params;
    try {
        const id = parseInt(assignmentId);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid Assignment ID." });
        }

        const assignment = await prisma.assetAssignment.findUnique({
            where: { id: id },
            include: {
                assignee: true,
                approvedBy: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        inventoryItem: {
                            include: {
                                productModel: true
                            }
                        }
                    }
                }
            }
        });

        if (!assignment) {
            return res.status(404).json({ error: 'Assignment record not found' });
        }
        
        res.status(200).json(assignment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch the assignment record.' });
    }
};

module.exports = assetAssignmentController;