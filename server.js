// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

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
const assetRoute = require('./routes/assetRoute');

const app = express();

// --- Middleware (ต้องอยู่ตรงนี้ ก่อน Routes) ---
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// --- API Routes (ต้องอยู่หลัง Middleware) ---
app.use('/api/assets', assetRoute); 
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