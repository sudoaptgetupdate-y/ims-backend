// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// --- START: ส่วนที่แก้ไข ---
const assetAssignmentRoute = require('./routes/assetAssignmentRoute');
// --- END ---

const categoryRoute = require('./routes/categoryRoute');
const customerRoute = require('./routes/customerRoute');
const authRoute = require('./routes/authRoute');
const productModelRoute = require('./routes/productModelRoute');
const inventoryItemRoute = require('./routes/inventoryItemRoute');
const brandRoute = require('./routes/brandRoute');
const saleRoute = require('./routes/saleRoute');
const dashboardRoute = require('./routes/dashboardRoute');
const userRoute = require('./routes/userRoute');
const borrowingRoute = require('./routes/borrowingRoute');

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// --- API Routes ---

// --- START: ส่วนที่แก้ไข ---
app.use('/api/asset-assignments', assetAssignmentRoute);
// --- END ---

app.use('/api/categories', categoryRoute);
app.use('/api/customers', customerRoute);
app.use('/api/auth', authRoute);
app.use('/api/product-models', productModelRoute);
app.use('/api/inventory-items', inventoryItemRoute);
app.use('/api/brands', brandRoute);
app.use('/api/sales', saleRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/users', userRoute);
app.use('/api/borrowings', borrowingRoute);

const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`Server is running on port ${port}`));