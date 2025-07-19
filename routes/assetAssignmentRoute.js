// routes/assetAssignmentRoute.js
const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware');
const { roleCheck } = require('../middlewares/roleCheckMiddleware');
const assetAssignmentController = require('../controllers/assetAssignmentController');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

router.get('/', authCheck, assetAssignmentController.getAllAssignments);
router.get('/:assignmentId', authCheck, assetAssignmentController.getAssignmentById);
router.post('/', authCheck, roleCheck(adminAccess), assetAssignmentController.createAssignment);
router.patch('/:assignmentId/return', authCheck, roleCheck(adminAccess), assetAssignmentController.returnItems);

module.exports = router;