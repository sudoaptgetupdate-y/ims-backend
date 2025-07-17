// routes/customerRoute.js

const express = require('express');
const router = express.Router();

// นำเข้า Middleware
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');

// นำเข้าฟังก์ชันจาก Controller
const { 
    createCustomer, 
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    getCustomerSales,
    getCustomerHistory
} = require('../controllers/customerController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];


// -- กำหนดเส้นทาง (Endpoints) --

// GET routes - อนุญาตให้ทุก Role ดูได้
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.get('/:id/history', authCheck, getCustomerHistory);
router.post('/', authCheck, roleCheck(adminAccess), createCustomer);
router.put('/:id', authCheck, roleCheck(adminAccess), updateCustomer);
router.delete('/:id', authCheck, roleCheck(adminAccess), deleteCustomer);


module.exports = router;