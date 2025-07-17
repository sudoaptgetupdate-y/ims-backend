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
    getCustomerSummary
} = require('../controllers/customerController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// -- กำหนดเส้นทาง (Endpoints) --
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.get('/:id/history', authCheck, getCustomerHistory);
router.get('/:id/summary', authCheck, getCustomerSummary);

router.post('/', authCheck, roleCheck(adminAccess), createCustomer);
router.put('/:id', authCheck, roleCheck(adminAccess), updateCustomer);
router.delete('/:id', authCheck, roleCheck(adminAccess), deleteCustomer);

module.exports = router;