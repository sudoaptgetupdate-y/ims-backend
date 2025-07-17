// routes/customerRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const { 
    createCustomer, 
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    getCustomerHistory,
    getCustomerSummary,
    getActiveBorrowings,
    getReturnedHistory,
    getPurchaseHistory
} = require('../controllers/customerController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// -- กำหนดเส้นทาง (Endpoints) --
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.get('/:id/history', authCheck, getCustomerHistory);
router.get('/:id/summary', authCheck, getCustomerSummary);
router.get('/:id/active-borrowings', authCheck, getActiveBorrowings);
router.get('/:id/returned-history', authCheck, getReturnedHistory);
router.get('/:id/purchase-history', authCheck, getPurchaseHistory);

router.post('/', authCheck, roleCheck(adminAccess), createCustomer);
router.put('/:id', authCheck, roleCheck(adminAccess), updateCustomer);
router.delete('/:id', authCheck, roleCheck(adminAccess), deleteCustomer);

module.exports = router;