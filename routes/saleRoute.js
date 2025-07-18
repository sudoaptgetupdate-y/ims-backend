// routes/saleRoute.js

const express = require('express');
const router = express.Router();

const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');

const saleController = require('../controllers/saleController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];
const superAdminAccess = ['SUPER_ADMIN'];

// -- กำหนดเส้นทาง (Endpoints) --
router.get('/', authCheck, saleController.getAllSales);
router.get('/:id', authCheck, saleController.getSaleById);
router.post('/', authCheck, roleCheck(adminAccess), saleController.createSale);
router.put('/:id', authCheck, roleCheck(adminAccess), saleController.updateSale);
router.patch('/:id/void', authCheck, roleCheck(superAdminAccess), saleController.voidSale);


module.exports = router;