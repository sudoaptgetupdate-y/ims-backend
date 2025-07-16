// middlewares/roleCheckMiddleware.js

// ฟังก์ชันนี้รับ Array ของ role ที่อนุญาตเข้ามา
exports.roleCheck = (roles) => {
    return (req, res, next) => {
        // req.user ควรจะมีข้อมูล user รวมถึง role จาก authCheck middleware
        const userRole = req.user?.role;

        if (roles.includes(userRole)) {
            // ถ้า role ของ user อยู่ใน list ที่อนุญาต ให้ไปต่อ
            next();
        } else {
            // ถ้าไม่มีสิทธิ์ ให้ส่ง 403 Forbidden
            res.status(403).json({ error: "Forbidden: You do not have the required permissions." });
        }
    };
};