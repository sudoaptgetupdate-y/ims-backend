// middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');

exports.authCheck = async (req, res, next) => {
    try {
        // 1. ดึง Token จาก Header ของ request
        const token = req.headers['authorization'].split(' ')[1]; // รูปแบบคือ "Bearer <token>"

        // ถ้าไม่มี token
        if (!token) {
            return res.status(401).send('No token provided, authorization denied');
        }
        
        // 2. ตรวจสอบความถูกต้องของ Token
        const decoded = jwt.verify(token, process.env.SECRET);

        // 3. ถ้าถูกต้อง ให้แนบข้อมูลผู้ใช้ (payload) ไปกับ request
        req.user = decoded.user;
        
        // 4. อนุญาตให้ไปทำขั้นตอนต่อไป (ไปที่ Controller)
        next();

    } catch (error) {
        console.log(error);
        res.status(401).send('Token is not valid');
    }
};