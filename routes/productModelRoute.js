// routes/productModelRoute.js

const express = require('express');
const router = express.Router();

// นำเข้า Middleware และ Controller
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const { 
    createProductModel, 
    getAllProductModels,
    getProductModelById,
    updateProductModel,
    deleteProductModel
} = require('../controllers/productModelController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// -- กำหนดเส้นทาง (Endpoints) --

// GET routes - อนุญาตให้ทุก Role ดูได้
router.get('/', getAllProductModels);
router.get('/:id', getProductModelById);

// POST, PUT, DELETE routes - จำกัดสิทธิ์
router.post('/', authCheck, roleCheck(adminAccess), createProductModel);
router.put('/:id', authCheck, roleCheck(adminAccess), updateProductModel);
router.delete('/:id', authCheck, roleCheck(adminAccess), deleteProductModel);

module.exports = router;