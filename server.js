const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Company = require('./models/Company');
const Bank = require('./models/Bank');
const Invoice = require('./models/Invoice');
const Customer = require('./models/Customer');
const Vendor = require('./models/Vendor');
const Item = require('./models/Item');
const Store = require('./models/Store');
const StoreProduct = require('./models/StoreProduct');
const StoreCategory = require('./models/StoreCategory');
const StoreOrder = require('./models/StoreOrder');
const Analytics = require('./models/Analytics');
const AnalyticsService = require('./services/analyticsService');
const CreditNote = require('./models/CreditNote');
const Purchase = require('./models/Purchase');
const PurchaseOrder = require('./models/PurchaseOrder');
const DebitNote = require('./models/DebitNote');
const Quotation = require('./models/Quotation');
const Proforma = require('./models/Proforma');
const DeliveryChallan = require('./models/DeliveryChallan');
const Expense = require('./models/Expense');
const Inventory = require('./models/Inventory');
const Payment = require('./models/Payment');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://e23cseu0134:teja1500@cluster1.plovieb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1';
    console.log('Connecting to MongoDB with URI:', mongoURI);
    await mongoose.connect(mongoURI, {
      dbName: 'invoice-swift' // Specify database name
    });
    console.log('MongoDB connected successfully to invoice-swift database');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Invoice Swift Backend API' });
});

// Signup route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, company } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const newUser = new User({
      email,
      password,
      firstName,
      lastName,
      company,
      isFirebaseUser: false
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        company: newUser.company
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Protected route example
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'Profile data',
    user: req.user
  });
});

// Company profile routes
// Get all company profiles for user
app.get('/api/company', authenticateToken, async (req, res) => {
  try {
    const companies = await Company.find({ userId: req.user.userId }).sort({ isDefault: -1, createdAt: -1 });
    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific company profile
app.get('/api/company/:id', authenticateToken, async (req, res) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }
    res.json(company);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new company profile
app.post('/api/company', authenticateToken, async (req, res) => {
  try {
    const {
      businessName,
      companyLogo,
      companyCountry,
      organisationName,
      companyName,
      companyPhone,
      companyEmail,
      gstIn,
      companyAddress,
      pincode,
      isDefault
    } = req.body;

    // Validate required fields
    if (!businessName || !companyCountry || !organisationName || !companyName || 
        !companyPhone || !companyEmail || !companyAddress || !pincode) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // If this is set as default, unset other default companies
    if (isDefault) {
      await Company.updateMany({ userId: req.user.userId }, { isDefault: false });
    }

    // Create new company profile
    const company = new Company({
      userId: req.user.userId,
      businessName,
      companyLogo,
      companyCountry,
      organisationName,
      companyName,
      companyPhone,
      companyEmail,
      gstIn,
      companyAddress,
      pincode,
      isDefault: isDefault || false
    });

    await company.save();
    res.status(201).json({ message: 'Company profile created successfully', company });
  } catch (error) {
    console.error('Company profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update company profile
app.put('/api/company/:id', authenticateToken, async (req, res) => {
  try {
    const {
      businessName,
      companyLogo,
      companyCountry,
      organisationName,
      companyName,
      companyPhone,
      companyEmail,
      gstIn,
      companyAddress,
      pincode,
      isDefault
    } = req.body;

    // Validate required fields
    if (!businessName || !companyCountry || !organisationName || !companyName || 
        !companyPhone || !companyEmail || !companyAddress || !pincode) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const company = await Company.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    // If this is set as default, unset other default companies
    if (isDefault) {
      await Company.updateMany({ userId: req.user.userId, _id: { $ne: req.params.id } }, { isDefault: false });
    }

    Object.assign(company, {
      businessName,
      companyLogo,
      companyCountry,
      organisationName,
      companyName,
      companyPhone,
      companyEmail,
      gstIn,
      companyAddress,
      pincode,
      isDefault: isDefault || false
    });

    await company.save();
    res.json({ message: 'Company profile updated successfully', company });
  } catch (error) {
    console.error('Company profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete company profile
app.delete('/api/company/:id', authenticateToken, async (req, res) => {
  try {
    const company = await Company.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }
    res.json({ message: 'Company profile deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Set default company
app.patch('/api/company/:id/set-default', authenticateToken, async (req, res) => {
  try {
    // Unset all other default companies
    await Company.updateMany({ userId: req.user.userId }, { isDefault: false });
    
    // Set this company as default
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isDefault: true },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    res.json({ message: 'Default company updated successfully', company });
  } catch (error) {
    console.error('Set default company error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Bank account routes
// Get all bank accounts for user
app.get('/api/bank-accounts', authenticateToken, async (req, res) => {
  try {
    const banks = await Bank.find({ userId: req.user.userId }).sort({ isDefault: -1, createdAt: -1 });
    res.json(banks);
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific bank account
app.get('/api/bank-accounts/:id', authenticateToken, async (req, res) => {
  try {
    const bank = await Bank.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!bank) {
      return res.status(404).json({ message: 'Bank account not found' });
    }
    res.json(bank);
  } catch (error) {
    console.error('Get bank account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new bank account
app.post('/api/bank-accounts', authenticateToken, async (req, res) => {
  try {
    const {
      accountNumber,
      confirmAccountNumber,
      ifscCode,
      bankName,
      branchName,
      upi,
      openingBalance,
      upiNumber,
      notes,
      isDefault
    } = req.body;

    // Validate required fields
    if (!accountNumber || !confirmAccountNumber || !ifscCode || !bankName || !branchName) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if account numbers match
    if (accountNumber !== confirmAccountNumber) {
      return res.status(400).json({ message: 'Account numbers do not match' });
    }

    // If this is set as default, unset other default accounts
    if (isDefault) {
      await Bank.updateMany({ userId: req.user.userId }, { isDefault: false });
    }

    const bank = new Bank({
      userId: req.user.userId,
      accountNumber,
      confirmAccountNumber,
      ifscCode,
      bankName,
      branchName,
      upi,
      openingBalance: openingBalance || 0,
      upiNumber,
      notes,
      isDefault: isDefault || false
    });

    await bank.save();
    res.status(201).json({ message: 'Bank account created successfully', bank });
  } catch (error) {
    console.error('Create bank account error:', error);
    if (error.message === 'Account numbers do not match') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update bank account
app.put('/api/bank-accounts/:id', authenticateToken, async (req, res) => {
  try {
    const {
      accountNumber,
      confirmAccountNumber,
      ifscCode,
      bankName,
      branchName,
      upi,
      openingBalance,
      upiNumber,
      notes,
      isDefault
    } = req.body;

    // Validate required fields
    if (!accountNumber || !confirmAccountNumber || !ifscCode || !bankName || !branchName) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if account numbers match
    if (accountNumber !== confirmAccountNumber) {
      return res.status(400).json({ message: 'Account numbers do not match' });
    }

    const bank = await Bank.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!bank) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    // If this is set as default, unset other default accounts
    if (isDefault) {
      await Bank.updateMany({ userId: req.user.userId, _id: { $ne: req.params.id } }, { isDefault: false });
    }

    Object.assign(bank, {
      accountNumber,
      confirmAccountNumber,
      ifscCode,
      bankName,
      branchName,
      upi,
      openingBalance: openingBalance || 0,
      upiNumber,
      notes,
      isDefault: isDefault || false
    });

    await bank.save();
    res.json({ message: 'Bank account updated successfully', bank });
  } catch (error) {
    console.error('Update bank account error:', error);
    if (error.message === 'Account numbers do not match') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete bank account
app.delete('/api/bank-accounts/:id', authenticateToken, async (req, res) => {
  try {
    const bank = await Bank.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!bank) {
      return res.status(404).json({ message: 'Bank account not found' });
    }
    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Set default bank account
app.patch('/api/bank-accounts/:id/set-default', authenticateToken, async (req, res) => {
  try {
    // Unset all other default accounts
    await Bank.updateMany({ userId: req.user.userId }, { isDefault: false });
    
    // Set this account as default
    const bank = await Bank.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isDefault: true },
      { new: true }
    );

    if (!bank) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    res.json({ message: 'Default bank account updated successfully', bank });
  } catch (error) {
    console.error('Set default bank account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// User signature routes
// Get user signature
app.get('/api/user/signature', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('signature');
    res.json({ signature: user?.signature || null });
  } catch (error) {
    console.error('Get signature error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Save user signature
app.post('/api/user/signature', authenticateToken, async (req, res) => {
  try {
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json({ message: 'Signature is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { signature },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Signature saved successfully', signature: user.signature });
  } catch (error) {
    console.error('Save signature error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Invoice routes
// Get all invoices with filtering and search
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { userId: req.user.userId };

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) {
        filter.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.invoiceDate.$lte = new Date(endDate);
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const invoices = await Invoice.find(filter)
      .populate('companyId', 'businessName companyName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(filter);

    res.json({
      invoices,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get invoice statistics
app.get('/api/invoices/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = { userId: req.user.userId };
    
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) {
        filter.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.invoiceDate.$lte = new Date(endDate);
      }
    }

    const stats = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalInvoices = await Invoice.countDocuments(filter);
    const totalAmount = await Invoice.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalInvoices,
      totalAmount: totalAmount[0]?.total || 0,
      statusBreakdown: stats
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific invoice
app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.userId })
      .populate('companyId', 'businessName companyName companyLogo companyAddress companyPhone companyEmail');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new invoice
app.post('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const {
      companyId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items,
      taxRate,
      dueDate,
      notes,
      status,
      subTotal,
      taxAmount,
      totalAmount
    } = req.body;

    // Validate required fields
    if (!companyId || !customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Company, customer name, and items are required' });
    }

    // Validate items
    for (const item of items) {
      if (!item.description || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ message: 'All items must have description, quantity, and unit price' });
      }
    }

    // Generate invoice number
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

    const invoice = new Invoice({
      userId: req.user.userId,
      companyId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items,
      taxRate: taxRate || 0,
      dueDate: new Date(dueDate),
      notes,
      status: status || 'draft',
      subtotal: subTotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      invoiceNumber: invoiceNumber
    });

    await invoice.save();
    await invoice.populate('companyId', 'businessName companyName');
    
    // Trigger analytics update
    AnalyticsService.triggerUpdate(req.user.userId).catch(console.error);
    
    // Auto-create payment if invoice is marked as paid
    if (status === 'paid') {
      const payment = new Payment({
        userId: req.user.userId,
        customerId: null, // Will be set if customer exists
        paymentNumber: '', // Will be auto-generated
        paymentDate: new Date(),
        amount: invoice.totalAmount,
        paymentMethod: 'Cash', // Default, can be updated
        paymentType: 'Received',
        status: 'completed',
        referenceType: 'invoice',
        referenceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        invoicePayments: [{
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount
        }]
      });
      await payment.save();
    }

    // Auto-update inventory for sales (stock out)
    for (const item of items) {
      if (item.itemId) {
        let inventory = await Inventory.findOne({ 
          userId: req.user.userId, 
          itemId: item.itemId 
        });

        if (inventory) {
          // Add stock movement
          inventory.movements.push({
            itemId: item.itemId,
            movementType: 'stock_out',
            quantity: item.quantity,
            referenceType: 'sale',
            referenceId: invoice._id,
            reason: 'Sales Invoice',
            notes: `Invoice ${invoice.invoiceNumber}`
          });

          // Update current stock
          inventory.currentStock -= item.quantity;
          await inventory.save();
        }
      }
    }
    
    res.status(201).json({ message: 'Invoice created successfully', invoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update invoice
app.put('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const {
      companyId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items,
      taxRate,
      dueDate,
      notes,
      status
    } = req.body;

    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    Object.assign(invoice, {
      companyId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items,
      taxRate: taxRate || 0,
      dueDate: new Date(dueDate),
      notes,
      status
    });

    await invoice.save();
    await invoice.populate('companyId', 'businessName companyName');
    
    res.json({ message: 'Invoice updated successfully', invoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update invoice status
app.patch('/api/invoices/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, paymentMethod, paymentReference } = req.body;

    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    invoice.status = status;
    
    if (status === 'paid') {
      invoice.paidDate = new Date();
      invoice.paymentMethod = paymentMethod;
      invoice.paymentReference = paymentReference;
    }

    await invoice.save();
    await invoice.populate('companyId', 'businessName companyName');
    
    res.json({ message: 'Invoice status updated successfully', invoice });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete invoice
app.delete('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Customer routes
// Get all customers with search
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    const filter = { userId: req.user.userId, isActive: true };
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const customers = await Customer.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(filter);

    res.json({
      customers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific customer
app.get('/api/customers/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new customer
app.post('/api/customers', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      gstNumber,
      panNumber,
      notes
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    // Check if customer with same email already exists
    if (email) {
      const existingCustomer = await Customer.findOne({ 
        userId: req.user.userId, 
        email: email.toLowerCase() 
      });
      if (existingCustomer) {
        return res.status(400).json({ message: 'Customer with this email already exists' });
      }
    }

    const customer = new Customer({
      userId: req.user.userId,
      name,
      email: email?.toLowerCase(),
      phone,
      address,
      gstNumber,
      panNumber,
      notes
    });

    await customer.save();
    res.status(201).json({ message: 'Customer created successfully', customer });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update customer
app.put('/api/customers/:id', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      gstNumber,
      panNumber,
      notes
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== customer.email) {
      const existingCustomer = await Customer.findOne({ 
        userId: req.user.userId, 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingCustomer) {
        return res.status(400).json({ message: 'Customer with this email already exists' });
      }
    }

    Object.assign(customer, {
      name,
      email: email?.toLowerCase(),
      phone,
      address,
      gstNumber,
      panNumber,
      notes
    });

    await customer.save();
    res.json({ message: 'Customer updated successfully', customer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete customer (soft delete)
app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isActive: false },
      { new: true }
    );
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Item routes
// Get all items with search
app.get('/api/items', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    const filter = { userId: req.user.userId, isActive: true };
    
    // Search functionality
    if (search) {
      filter.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const items = await Item.find(filter)
      .sort({ itemName: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Item.countDocuments(filter);

    res.json({
      items,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific item
app.get('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new item
app.post('/api/items', authenticateToken, async (req, res) => {
  try {
    const {
      itemType,
      itemName,
      description,
      basePrice,
      isTaxIncluded,
      sellingPrice,
      taxPercent,
      primaryUnit
    } = req.body;

    // Validate required fields
    if (!itemName || basePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({ message: 'Item name, base price, and selling price are required' });
    }

    const item = new Item({
      userId: req.user.userId,
      itemType,
      itemName,
      description,
      basePrice,
      isTaxIncluded,
      sellingPrice,
      taxPercent,
      primaryUnit
    });

    await item.save();
    res.status(201).json({ message: 'Item created successfully', item });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update item
app.put('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const {
      itemType,
      itemName,
      description,
      basePrice,
      isTaxIncluded,
      sellingPrice,
      taxPercent,
      primaryUnit
    } = req.body;

    // Validate required fields
    if (!itemName || basePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({ message: 'Item name, base price, and selling price are required' });
    }

    const item = await Item.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    Object.assign(item, {
      itemType,
      itemName,
      description,
      basePrice,
      isTaxIncluded,
      sellingPrice,
      taxPercent,
      primaryUnit
    });

    await item.save();
    res.json({ message: 'Item updated successfully', item });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete item (soft delete)
app.delete('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isActive: false },
      { new: true }
    );
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Purchase Orders API Routes
// Get all purchase orders
app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (search) {
      query.$or = [
        { purchaseOrderNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('companyId', 'businessName companyName')
      .populate('vendorId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      purchaseOrders,
      pagination: {
        currentPage: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single purchase order
app.get('/api/purchase-orders/:id', authenticateToken, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({ _id: req.params.id, userId: req.user.userId })
      .populate('companyId', 'businessName companyName companyAddress companyPhone companyEmail')
      .populate('vendorId', 'name email phone address');
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    res.json(purchaseOrder);
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create purchase order
app.post('/api/purchase-orders', authenticateToken, async (req, res) => {
  try {
    console.log('Purchase order creation request:', req.body);
    const {
      companyId,
      vendorId,
      vendorName,
      vendorEmail,
      vendorPhone,
      vendorAddress,
      vendorGSTIN,
      orderDate,
      expectedDeliveryDate,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      status,
      terms,
      notes
    } = req.body;

    // Validate required fields
    if (!companyId || !vendorName || !expectedDeliveryDate || !items || !totalAmount) {
      console.log('Missing required fields:', {
        companyId: !!companyId,
        vendorName: !!vendorName,
        expectedDeliveryDate: !!expectedDeliveryDate,
        items: !!items,
        totalAmount: !!totalAmount
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      console.log('Invalid items array:', items);
      return res.status(400).json({ message: 'Items array is required and must not be empty' });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName || !item.quantity || !item.unitPrice) {
        console.log(`Invalid item at index ${i}:`, item);
        return res.status(400).json({ message: `Item ${i + 1} is missing required fields (itemName, quantity, unitPrice)` });
      }
    }

    // Handle vendorId - only include if it's a valid ObjectId
    const purchaseOrderData = {
      userId: req.user.userId,
      companyId,
      vendorName,
      orderDate: new Date(orderDate),
      expectedDeliveryDate: new Date(expectedDeliveryDate),
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      status: status || 'draft'
    };

    // Only include optional fields if they have valid values
    if (vendorId && vendorId !== '' && mongoose.Types.ObjectId.isValid(vendorId)) {
      purchaseOrderData.vendorId = vendorId;
    }
    if (vendorEmail && vendorEmail.trim() !== '') {
      purchaseOrderData.vendorEmail = vendorEmail.trim();
    }
    if (vendorPhone && vendorPhone.trim() !== '') {
      purchaseOrderData.vendorPhone = vendorPhone.trim();
    }
    if (vendorAddress && vendorAddress.trim() !== '') {
      purchaseOrderData.vendorAddress = vendorAddress.trim();
    }
    if (vendorGSTIN && vendorGSTIN.trim() !== '') {
      purchaseOrderData.vendorGSTIN = vendorGSTIN.trim();
    }
    if (terms && terms.trim() !== '') {
      purchaseOrderData.terms = terms.trim();
    }
    if (notes && notes.trim() !== '') {
      purchaseOrderData.notes = notes.trim();
    }

    console.log('Creating purchase order with data:', purchaseOrderData);
    const purchaseOrder = new PurchaseOrder(purchaseOrderData);

    // Ensure purchase order number is generated
    if (!purchaseOrder.purchaseOrderNumber) {
      const count = await PurchaseOrder.countDocuments({ userId: req.user.userId });
      purchaseOrder.purchaseOrderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Manually generated purchase order number:', purchaseOrder.purchaseOrderNumber);
    }

    console.log('Purchase order before save:', {
      purchaseOrderNumber: purchaseOrder.purchaseOrderNumber,
      userId: purchaseOrder.userId,
      companyId: purchaseOrder.companyId,
      vendorName: purchaseOrder.vendorName
    });

    await purchaseOrder.save();
    console.log('Purchase order saved successfully:', purchaseOrder._id, 'Purchase Order Number:', purchaseOrder.purchaseOrderNumber);
    await purchaseOrder.populate('companyId', 'businessName companyName');
    await purchaseOrder.populate('vendorId', 'name email phone');

    res.status(201).json(purchaseOrder);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ message: 'Error creating purchase order', error: error.message });
  }
});

// Update purchase order
app.put('/api/purchase-orders/:id', authenticateToken, async (req, res) => {
  try {
    const {
      vendorId,
      vendorName,
      vendorEmail,
      vendorPhone,
      vendorAddress,
      vendorGSTIN,
      orderDate,
      expectedDeliveryDate,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      status,
      terms,
      notes
    } = req.body;

    const updateData = {
      vendorName,
      orderDate: new Date(orderDate),
      expectedDeliveryDate: new Date(expectedDeliveryDate),
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      status
    };

    // Only include optional fields if they have valid values
    if (vendorId && vendorId !== '' && mongoose.Types.ObjectId.isValid(vendorId)) {
      updateData.vendorId = vendorId;
    }
    if (vendorEmail && vendorEmail.trim() !== '') {
      updateData.vendorEmail = vendorEmail.trim();
    }
    if (vendorPhone && vendorPhone.trim() !== '') {
      updateData.vendorPhone = vendorPhone.trim();
    }
    if (vendorAddress && vendorAddress.trim() !== '') {
      updateData.vendorAddress = vendorAddress.trim();
    }
    if (vendorGSTIN && vendorGSTIN.trim() !== '') {
      updateData.vendorGSTIN = vendorGSTIN.trim();
    }
    if (terms && terms.trim() !== '') {
      updateData.terms = terms.trim();
    }
    if (notes && notes.trim() !== '') {
      updateData.notes = notes.trim();
    }

    const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      updateData,
      { new: true }
    );

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    await purchaseOrder.populate('companyId', 'businessName companyName');
    await purchaseOrder.populate('vendorId', 'name email phone');
    
    res.json({ message: 'Purchase order updated successfully', purchaseOrder });
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update purchase order status
app.patch('/api/purchase-orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { status },
      { new: true }
    );

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    await purchaseOrder.populate('companyId', 'businessName companyName');
    await purchaseOrder.populate('vendorId', 'name email phone');
    
    res.json({ message: 'Purchase order status updated successfully', purchaseOrder });
  } catch (error) {
    console.error('Update purchase order status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete purchase order
app.delete('/api/purchase-orders/:id', authenticateToken, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Credit Notes API Routes
// Get all credit notes
app.get('/api/credit-notes', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (search) {
      query.$or = [
        { creditNoteNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { originalInvoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.creditNoteDate = {};
      if (startDate) query.creditNoteDate.$gte = new Date(startDate);
      if (endDate) query.creditNoteDate.$lte = new Date(endDate);
    }

    const creditNotes = await CreditNote.find(query)
      .populate('companyId', 'businessName companyName')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CreditNote.countDocuments(query);

    res.json({
      creditNotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching credit notes', error: error.message });
  }
});

// Get credit note by ID
app.get('/api/credit-notes/:id', authenticateToken, async (req, res) => {
  try {
    const creditNote = await CreditNote.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    })
    .populate('companyId')
    .populate('customerId')
    .populate('originalInvoiceId');

    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching credit note', error: error.message });
  }
});

// Create credit note
app.post('/api/credit-notes', authenticateToken, async (req, res) => {
  try {
    console.log('Credit note creation request:', req.body);
    const {
      companyId,
      originalInvoiceId,
      originalInvoiceNumber,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      reason,
      description,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      notes
    } = req.body;

    // Validate required fields
    if (!companyId || !originalInvoiceId || !originalInvoiceNumber || !customerName || !reason || !items || !totalAmount) {
      console.log('Missing required fields:', {
        companyId: !!companyId,
        originalInvoiceId: !!originalInvoiceId,
        originalInvoiceNumber: !!originalInvoiceNumber,
        customerName: !!customerName,
        reason: !!reason,
        items: !!items,
        totalAmount: !!totalAmount
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Handle customerId - only include if it's a valid ObjectId
    const creditNoteData = {
      userId: req.user.userId,
      companyId,
      originalInvoiceId,
      originalInvoiceNumber,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      reason,
      description,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      notes
    };

    // Only include customerId if it's a valid ObjectId
    if (customerId && customerId !== '' && mongoose.Types.ObjectId.isValid(customerId)) {
      creditNoteData.customerId = customerId;
    }

    const creditNote = new CreditNote(creditNoteData);

    // Ensure credit note number is generated
    if (!creditNote.creditNoteNumber) {
      const count = await CreditNote.countDocuments({ userId: req.user.userId });
      creditNote.creditNoteNumber = `CN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Manually generated credit note number:', creditNote.creditNoteNumber);
    }

    console.log('Credit note before save:', {
      creditNoteNumber: creditNote.creditNoteNumber,
      userId: creditNote.userId,
      companyId: creditNote.companyId
    });

    await creditNote.save();
    console.log('Credit note saved successfully:', creditNote._id, 'Credit Note Number:', creditNote.creditNoteNumber);
    await creditNote.populate('companyId', 'businessName companyName');
    await creditNote.populate('customerId', 'name email phone');

    res.status(201).json(creditNote);
  } catch (error) {
    res.status(500).json({ message: 'Error creating credit note', error: error.message });
  }
});

// Update credit note
app.put('/api/credit-notes/:id', authenticateToken, async (req, res) => {
  try {
    const creditNote = await CreditNote.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    ).populate('companyId', 'businessName companyName')
     .populate('customerId', 'name email phone');

    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ message: 'Error updating credit note', error: error.message });
  }
});

// Update credit note status
app.patch('/api/credit-notes/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'issued', 'applied', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { status };
    if (status === 'applied') {
      updateData.appliedDate = new Date();
    }

    const creditNote = await CreditNote.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      updateData,
      { new: true }
    ).populate('companyId', 'businessName companyName')
     .populate('customerId', 'name email phone');

    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ message: 'Error updating credit note status', error: error.message });
  }
});

// Delete credit note
app.delete('/api/credit-notes/:id', authenticateToken, async (req, res) => {
  try {
    const creditNote = await CreditNote.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    res.json({ message: 'Credit note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting credit note', error: error.message });
  }
});

// Get credit notes stats
app.get('/api/credit-notes/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (startDate || endDate) {
      query.creditNoteDate = {};
      if (startDate) query.creditNoteDate.$gte = new Date(startDate);
      if (endDate) query.creditNoteDate.$lte = new Date(endDate);
    }

    const totalCreditNotes = await CreditNote.countDocuments(query);
    const totalAmount = await CreditNote.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const statusBreakdown = await CreditNote.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalCreditNotes,
      totalAmount: totalAmount[0]?.total || 0,
      statusBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching credit notes stats', error: error.message });
  }
});

// Purchases API Routes
// Get all purchases
app.get('/api/purchases', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (search) {
      query.$or = [
        { purchaseNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(query)
      .populate('companyId', 'businessName companyName')
      .populate('vendorId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Purchase.countDocuments(query);

    res.json({
      purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchases', error: error.message });
  }
});

// Create purchase
app.post('/api/purchases', authenticateToken, async (req, res) => {
  try {
    console.log('Purchase creation request:', req.body);
    const {
      companyId,
      vendorId,
      vendorName,
      vendorEmail,
      vendorPhone,
      vendorAddress,
      vendorGSTIN,
      dueDate,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      paymentMethod,
      notes
    } = req.body;

    // Validate required fields
    if (!companyId || !vendorName || !items || !totalAmount) {
      console.log('Missing required fields:', {
        companyId: !!companyId,
        vendorName: !!vendorName,
        items: !!items,
        totalAmount: !!totalAmount
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      console.log('Invalid items array:', items);
      return res.status(400).json({ message: 'Items array is required and must not be empty' });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName || !item.quantity || !item.unitPrice) {
        console.log(`Invalid item at index ${i}:`, item);
        return res.status(400).json({ message: `Item ${i + 1} is missing required fields (itemName, quantity, unitPrice)` });
      }
    }

    // Handle vendorId - only include if it's a valid ObjectId
    const purchaseData = {
      userId: req.user.userId,
      companyId,
      vendorName,
      dueDate: new Date(dueDate),
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      paymentMethod
    };

    // Only include optional fields if they have valid values
    if (vendorId && vendorId !== '' && mongoose.Types.ObjectId.isValid(vendorId)) {
      purchaseData.vendorId = vendorId;
    }
    if (vendorEmail && vendorEmail.trim() !== '') {
      purchaseData.vendorEmail = vendorEmail.trim();
    }
    if (vendorPhone && vendorPhone.trim() !== '') {
      purchaseData.vendorPhone = vendorPhone.trim();
    }
    if (vendorAddress && vendorAddress.trim() !== '') {
      purchaseData.vendorAddress = vendorAddress.trim();
    }
    if (vendorGSTIN && vendorGSTIN.trim() !== '') {
      purchaseData.vendorGSTIN = vendorGSTIN.trim();
    }
    if (notes && notes.trim() !== '') {
      purchaseData.notes = notes.trim();
    }

    console.log('Creating purchase with data:', purchaseData);
    const purchase = new Purchase(purchaseData);

    // Ensure purchase number is generated
    if (!purchase.purchaseNumber) {
      const count = await Purchase.countDocuments({ userId: req.user.userId });
      purchase.purchaseNumber = `PUR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Manually generated purchase number:', purchase.purchaseNumber);
    }

    console.log('Purchase before save:', {
      purchaseNumber: purchase.purchaseNumber,
      userId: purchase.userId,
      companyId: purchase.companyId,
      vendorName: purchase.vendorName
    });

    await purchase.save();
    console.log('Purchase saved successfully:', purchase._id, 'Purchase Number:', purchase.purchaseNumber);
    
    // Trigger analytics update
    AnalyticsService.triggerUpdate(req.user.userId).catch(console.error);
    
    await purchase.populate('companyId', 'businessName companyName');
    await purchase.populate('vendorId', 'name email phone');

    // Auto-create payment for purchase
    try {
      const paymentData = {
        userId: req.user.userId,
        paymentNumber: '', // Will be auto-generated
        paymentDate: new Date(),
        amount: totalAmount,
        paymentMethod: paymentMethod || 'Cash',
        paymentType: 'Paid',
        status: 'completed',
        referenceType: 'purchase',
        referenceId: purchase._id,
        referenceNumber: purchase.purchaseNumber,
        description: `Payment for Purchase ${purchase.purchaseNumber}`,
        purchasePayments: [{
          purchaseId: purchase._id,
          purchaseNumber: purchase.purchaseNumber,
          amount: totalAmount
        }]
      };

      // Only include customerId if vendorId is valid
      if (vendorId && vendorId !== '' && mongoose.Types.ObjectId.isValid(vendorId)) {
        paymentData.customerId = vendorId;
      }

      const payment = new Payment(paymentData);
      await payment.save();
      console.log('Payment created successfully:', payment._id);
    } catch (paymentError) {
      console.error('Error creating payment:', paymentError);
      // Continue with purchase creation even if payment fails
    }

    // Auto-update inventory for purchases (stock in)
    try {
      for (const item of items) {
        if (item.itemId) {
          let inventory = await Inventory.findOne({ 
            userId: req.user.userId, 
            itemId: item.itemId 
          });

          if (!inventory) {
            // Create new inventory record
            inventory = new Inventory({
              userId: req.user.userId,
              itemId: item.itemId,
              currentStock: 0,
              reservedStock: 0
            });
          }

          // Add stock movement
          inventory.movements.push({
            itemId: item.itemId,
            movementType: 'stock_in',
            quantity: item.quantity,
            referenceType: 'purchase',
            referenceId: purchase._id,
            reason: 'Purchase Invoice',
            notes: `Purchase ${purchase.purchaseNumber}`
          });

          // Update current stock
          inventory.currentStock += item.quantity;
          await inventory.save();
        }
      }
      console.log('Inventory updated successfully');
    } catch (inventoryError) {
      console.error('Error updating inventory:', inventoryError);
      // Continue with purchase creation even if inventory update fails
    }

    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Error creating purchase', error: error.message });
  }
});

// Purchase Orders API Routes
app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (search) {
      query.$or = [
        { purchaseOrderNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('companyId', 'businessName companyName')
      .populate('vendorId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      purchaseOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase orders', error: error.message });
  }
});

// Create purchase order
app.post('/api/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const {
      companyId,
      vendorId,
      vendorName,
      vendorEmail,
      vendorPhone,
      vendorAddress,
      vendorGSTIN,
      expectedDeliveryDate,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      terms,
      notes
    } = req.body;

    if (!companyId || !vendorName || !items || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const purchaseOrder = new PurchaseOrder({
      userId: req.user.userId,
      companyId,
      vendorId,
      vendorName,
      vendorEmail,
      vendorPhone,
      vendorAddress,
      vendorGSTIN,
      expectedDeliveryDate,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      terms,
      notes
    });

    await purchaseOrder.save();
    await purchaseOrder.populate('companyId', 'businessName companyName');
    await purchaseOrder.populate('vendorId', 'name email phone');

    res.status(201).json(purchaseOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error creating purchase order', error: error.message });
  }
});

// Debit Notes API Routes
app.get('/api/debit-notes', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (search) {
      query.$or = [
        { debitNoteNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { originalPurchaseNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.debitNoteDate = {};
      if (startDate) query.debitNoteDate.$gte = new Date(startDate);
      if (endDate) query.debitNoteDate.$lte = new Date(endDate);
    }

    const debitNotes = await DebitNote.find(query)
      .populate('companyId', 'businessName companyName')
      .populate('vendorId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DebitNote.countDocuments(query);

    res.json({
      debitNotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching debit notes', error: error.message });
  }
});

// Create debit note
app.post('/api/debit-notes', authenticateToken, async (req, res) => {
  try {
    console.log('Debit note creation request:', req.body);
    const {
      companyId,
      originalPurchaseId,
      originalPurchaseNumber,
      vendorId,
      vendorName,
      vendorEmail,
      vendorPhone,
      vendorAddress,
      reason,
      description,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      notes
    } = req.body;

    if (!companyId || !originalPurchaseId || !originalPurchaseNumber || !vendorName || !reason || !items || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const debitNote = new DebitNote({
      userId: req.user.userId,
      companyId,
      originalPurchaseId,
      originalPurchaseNumber,
      vendorId,
      vendorName,
      vendorEmail,
      vendorPhone,
      vendorAddress,
      reason,
      description,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      notes
    });

    // Ensure debit note number is generated
    if (!debitNote.debitNoteNumber) {
      const count = await DebitNote.countDocuments({ userId: req.user.userId });
      debitNote.debitNoteNumber = `DN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Manually generated debit note number:', debitNote.debitNoteNumber);
    }

    console.log('Debit note before save:', {
      debitNoteNumber: debitNote.debitNoteNumber,
      userId: debitNote.userId,
      companyId: debitNote.companyId,
      vendorName: debitNote.vendorName
    });

    await debitNote.save();
    console.log('Debit note saved successfully:', debitNote._id, 'Debit Note Number:', debitNote.debitNoteNumber);
    await debitNote.populate('companyId', 'businessName companyName');
    await debitNote.populate('vendorId', 'name email phone');

    res.status(201).json(debitNote);
  } catch (error) {
    res.status(500).json({ message: 'Error creating debit note', error: error.message });
  }
});

// Quotations API Routes
// Get all quotations
app.get('/api/quotations', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (search) {
      query.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.quotationDate = {};
      if (startDate) query.quotationDate.$gte = new Date(startDate);
      if (endDate) query.quotationDate.$lte = new Date(endDate);
    }

    const quotations = await Quotation.find(query)
      .populate('companyId', 'businessName companyName')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Quotation.countDocuments(query);

    res.json({
      quotations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quotations', error: error.message });
  }
});

// Create quotation
app.post('/api/quotations', authenticateToken, async (req, res) => {
  try {
    console.log('Quotation creation request:', req.body);
    const {
      companyId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      validUntil,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      terms,
      notes
    } = req.body;

    if (!companyId || !customerName || !items || !totalAmount) {
      console.log('Missing required fields:', {
        companyId: !!companyId,
        customerName: !!customerName,
        items: !!items,
        totalAmount: !!totalAmount
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const quotation = new Quotation({
      userId: req.user.userId,
      companyId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      validUntil,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      terms,
      notes
    });

    // Ensure quotation number is generated
    if (!quotation.quotationNumber) {
      const count = await Quotation.countDocuments({ userId: req.user.userId });
      quotation.quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Manually generated quotation number:', quotation.quotationNumber);
    }

    console.log('Quotation before save:', {
      quotationNumber: quotation.quotationNumber,
      userId: quotation.userId,
      companyId: quotation.companyId,
      customerName: quotation.customerName
    });

    await quotation.save();
    console.log('Quotation saved successfully:', quotation._id, 'Quotation Number:', quotation.quotationNumber);
    await quotation.populate('companyId', 'businessName companyName');
    await quotation.populate('customerId', 'name email phone');

    res.status(201).json(quotation);
  } catch (error) {
    console.error('Error creating quotation:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ message: 'Error creating quotation', error: error.message });
  }
});

// Convert quotation to invoice
app.post('/api/quotations/:id/convert-to-invoice', authenticateToken, async (req, res) => {
  try {
    const quotation = await Quotation.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Create invoice from quotation
    const invoice = new Invoice({
      userId: req.user.userId,
      companyId: quotation.companyId,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      items: quotation.items,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      totalDiscount: quotation.totalDiscount,
      totalAmount: quotation.totalAmount,
      status: 'draft',
      notes: `Converted from quotation ${quotation.quotationNumber}`
    });

    await invoice.save();

    // Update quotation status
    quotation.status = 'converted';
    quotation.convertedToInvoice = invoice._id;
    quotation.convertedDate = new Date();
    await quotation.save();

    res.json({ invoice, quotation });
  } catch (error) {
    res.status(500).json({ message: 'Error converting quotation to invoice', error: error.message });
  }
});

// Proforma API Routes
app.get('/api/proformas', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (search) {
      query.$or = [
        { proformaNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.proformaDate = {};
      if (startDate) query.proformaDate.$gte = new Date(startDate);
      if (endDate) query.proformaDate.$lte = new Date(endDate);
    }

    const proformas = await Proforma.find(query)
      .populate('companyId', 'businessName companyName')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Proforma.countDocuments(query);

    res.json({
      proformas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching proformas', error: error.message });
  }
});

// Create proforma
app.post('/api/proformas', authenticateToken, async (req, res) => {
  try {
    console.log('Proforma creation request:', req.body);
    const {
      companyId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      validUntil,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      terms,
      notes
    } = req.body;

    if (!companyId || !customerName || !items || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const proforma = new Proforma({
      userId: req.user.userId,
      companyId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      validUntil,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      terms,
      notes
    });

    // Ensure proforma number is generated
    if (!proforma.proformaNumber) {
      const count = await Proforma.countDocuments({ userId: req.user.userId });
      proforma.proformaNumber = `PF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Manually generated proforma number:', proforma.proformaNumber);
    }

    console.log('Proforma before save:', {
      proformaNumber: proforma.proformaNumber,
      userId: proforma.userId,
      companyId: proforma.companyId,
      customerName: proforma.customerName
    });

    await proforma.save();
    console.log('Proforma saved successfully:', proforma._id, 'Proforma Number:', proforma.proformaNumber);
    await proforma.populate('companyId', 'businessName companyName');
    await proforma.populate('customerId', 'name email phone');

    res.status(201).json(proforma);
  } catch (error) {
    res.status(500).json({ message: 'Error creating proforma', error: error.message });
  }
});

// Convert proforma to invoice
app.post('/api/proformas/:id/convert-to-invoice', authenticateToken, async (req, res) => {
  try {
    const proforma = await Proforma.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!proforma) {
      return res.status(404).json({ message: 'Proforma not found' });
    }

    // Create invoice from proforma
    const invoice = new Invoice({
      userId: req.user.userId,
      companyId: proforma.companyId,
      customerId: proforma.customerId,
      customerName: proforma.customerName,
      customerEmail: proforma.customerEmail,
      customerPhone: proforma.customerPhone,
      customerAddress: proforma.customerAddress,
      items: proforma.items,
      subtotal: proforma.subtotal,
      taxAmount: proforma.taxAmount,
      totalDiscount: proforma.totalDiscount,
      totalAmount: proforma.totalAmount,
      status: 'draft',
      notes: `Converted from proforma ${proforma.proformaNumber}`
    });

    await invoice.save();

    // Update proforma status
    proforma.status = 'converted';
    proforma.convertedToInvoice = invoice._id;
    proforma.convertedDate = new Date();
    await proforma.save();

    res.json({ invoice, proforma });
  } catch (error) {
    res.status(500).json({ message: 'Error converting proforma to invoice', error: error.message });
  }
});

// Delivery Challans API Routes
app.get('/api/delivery-challans', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (search) {
      query.$or = [
        { challanNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.challanDate = {};
      if (startDate) query.challanDate.$gte = new Date(startDate);
      if (endDate) query.challanDate.$lte = new Date(endDate);
    }

    const deliveryChallans = await DeliveryChallan.find(query)
      .populate('companyId', 'businessName companyName')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DeliveryChallan.countDocuments(query);

    res.json({
      deliveryChallans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching delivery challans', error: error.message });
  }
});

// Create delivery challan
app.post('/api/delivery-challans', authenticateToken, async (req, res) => {
  try {
    console.log('Delivery challan creation request:', req.body);
    const {
      companyId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      deliveryAddress,
      deliveryDate,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      deliveryPerson,
      vehicleNumber,
      terms,
      notes
    } = req.body;

    if (!companyId || !customerName || !items || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const deliveryChallan = new DeliveryChallan({
      userId: req.user.userId,
      companyId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      deliveryAddress,
      deliveryDate,
      items,
      subtotal,
      taxAmount,
      totalDiscount,
      totalAmount,
      deliveryPerson,
      vehicleNumber,
      terms,
      notes
    });

    // Ensure challan number is generated
    if (!deliveryChallan.challanNumber) {
      const count = await DeliveryChallan.countDocuments({ userId: req.user.userId });
      deliveryChallan.challanNumber = `DC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Manually generated challan number:', deliveryChallan.challanNumber);
    }

    console.log('Delivery challan before save:', {
      challanNumber: deliveryChallan.challanNumber,
      userId: deliveryChallan.userId,
      companyId: deliveryChallan.companyId,
      customerName: deliveryChallan.customerName
    });

    await deliveryChallan.save();
    console.log('Delivery challan saved successfully:', deliveryChallan._id, 'Challan Number:', deliveryChallan.challanNumber);
    await deliveryChallan.populate('companyId', 'businessName companyName');
    await deliveryChallan.populate('customerId', 'name email phone');

    res.status(201).json(deliveryChallan);
  } catch (error) {
    res.status(500).json({ message: 'Error creating delivery challan', error: error.message });
  }
});

// Convert delivery challan to invoice
app.post('/api/delivery-challans/:id/convert-to-invoice', authenticateToken, async (req, res) => {
  try {
    const deliveryChallan = await DeliveryChallan.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!deliveryChallan) {
      return res.status(404).json({ message: 'Delivery challan not found' });
    }

    // Create invoice from delivery challan
    const invoice = new Invoice({
      userId: req.user.userId,
      companyId: deliveryChallan.companyId,
      customerId: deliveryChallan.customerId,
      customerName: deliveryChallan.customerName,
      customerEmail: deliveryChallan.customerEmail,
      customerPhone: deliveryChallan.customerPhone,
      customerAddress: deliveryChallan.customerAddress,
      items: deliveryChallan.items,
      subtotal: deliveryChallan.subtotal,
      taxAmount: deliveryChallan.taxAmount,
      totalDiscount: deliveryChallan.totalDiscount,
      totalAmount: deliveryChallan.totalAmount,
      status: 'draft',
      notes: `Converted from delivery challan ${deliveryChallan.challanNumber}`
    });

    await invoice.save();

    // Update delivery challan status
    deliveryChallan.status = 'converted';
    deliveryChallan.convertedToInvoice = invoice._id;
    deliveryChallan.convertedDate = new Date();
    await deliveryChallan.save();

    res.json({ invoice, deliveryChallan });
  } catch (error) {
    res.status(500).json({ message: 'Error converting delivery challan to invoice', error: error.message });
  }
});

// Expense API Routes
// Get all expenses
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    console.log('Expenses API called by user:', req.user.id);
    const { page = 1, limit = 10, search = '', category = '', status = '', startDate = '', endDate = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = { userId: req.user.userId };
    
    if (search) {
      query.$or = [
        { expenseNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.expenseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    console.log('Query:', query);
    const expenses = await Expense.find(query)
      .populate('companyId', 'businessName companyName')
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(query);
    const pages = Math.ceil(total / limit);

    console.log('Found expenses:', expenses.length);
    res.json({
      expenses,
      pagination: {
        current: parseInt(page),
        pages,
        total
      }
    });
  } catch (error) {
    console.error('Expenses API Error:', error);
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
});

// Get single expense
app.get('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    }).populate('companyId', 'businessName companyName');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expense', error: error.message });
  }
});

// Create expense
app.post('/api/expenses', authenticateToken, async (req, res) => {
  try {
    console.log('Create expense API called by user:', req.user.userId);
    console.log('Request body:', req.body);
    
    const {
      companyId,
      category,
      description,
      amount,
      expenseDate,
      isPaid,
      paymentType,
      paymentMethod,
      vendorName,
      vendorEmail,
      vendorPhone,
      receiptNumber,
      notes
    } = req.body;

    // Validate required fields
    if (!companyId || !category || !description || !amount || !paymentType) {
      console.log('Missing required fields:', {
        companyId: !!companyId,
        category: !!category,
        description: !!description,
        amount: !!amount,
        paymentType: !!paymentType
      });
      return res.status(400).json({ message: 'Missing required fields: companyId, category, description, amount, paymentType' });
    }

    const expenseData = {
      userId: req.user.userId,
      companyId,
      category,
      description,
      amount,
      expenseDate: new Date(expenseDate),
      isPaid: isPaid || false,
      paymentType,
      paymentMethod,
      vendorName,
      vendorEmail,
      vendorPhone,
      receiptNumber,
      notes
    };

    console.log('Expense data:', expenseData);
    const expense = new Expense(expenseData);
    
    // Ensure expense number is generated
    if (!expense.expenseNumber) {
      const count = await Expense.countDocuments({ userId: req.user.userId });
      expense.expenseNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Manually generated expense number:', expense.expenseNumber);
    }
    
    await expense.save();

    // Trigger analytics update
    AnalyticsService.triggerUpdate(req.user.userId).catch(console.error);

    await expense.populate('companyId', 'businessName companyName');

    console.log('Expense created successfully:', expense._id);
    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Error creating expense', error: error.message });
  }
});

// Update expense
app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    ).populate('companyId', 'businessName companyName');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: 'Error updating expense', error: error.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting expense', error: error.message });
  }
});

// Get expense statistics
app.get('/api/expenses/stats', authenticateToken, async (req, res) => {
  try {
    console.log('Expenses stats API called by user:', req.user.userId);
    const { startDate = '', endDate = '' } = req.query;
    
    let matchQuery = { userId: req.user.userId };
    
    if (startDate && endDate) {
      matchQuery.expenseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    console.log('Match query for stats:', matchQuery);

    const stats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$isPaid', true] }, '$amount', 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$isPaid', false] }, '$amount', 0] }
          }
        }
      }
    ]);

    console.log('Stats aggregation result:', stats);

    const categoryStats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    console.log('Category stats result:', categoryStats);

    res.json({
      summary: stats[0] || {
        totalExpenses: 0,
        totalCount: 0,
        paidCount: 0,
        paidAmount: 0,
        pendingAmount: 0
      },
      categoryBreakdown: categoryStats
    });
  } catch (error) {
    console.error('Error fetching expense statistics:', error);
    res.status(500).json({ message: 'Error fetching expense statistics', error: error.message });
  }
});

// Get items statistics
app.get('/api/items/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await Item.aggregate([
      { $match: { userId: req.user.userId } },
      {
        $group: {
          _id: null,
          totalProducts: {
            $sum: { $cond: [{ $eq: ['$itemType', 'Product'] }, 1, 0] }
          },
          totalServices: {
            $sum: { $cond: [{ $eq: ['$itemType', 'Service'] }, 1, 0] }
          },
          activeItems: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveItems: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      totalProducts: 0,
      totalServices: 0,
      activeItems: 0,
      inactiveItems: 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items statistics', error: error.message });
  }
});

// Bulk upload items from Excel
app.post('/api/items/bulk-upload', authenticateToken, async (req, res) => {
  try {
    // For now, we'll simulate the bulk upload
    // In a real implementation, you would use a library like 'xlsx' to parse the Excel file
    
    console.log('Bulk upload request received');
    
    // Simulate processing
    const sampleItems = [
      {
        itemName: 'Sample Product 1',
        itemType: 'Product',
        description: 'Sample product description',
        basePrice: 100,
        sellingPrice: 120,
        taxPercent: 18,
        primaryUnit: 'pcs',
        userId: req.user.userId
      },
      {
        itemName: 'Sample Service 1',
        itemType: 'Service',
        description: 'Sample service description',
        basePrice: 500,
        sellingPrice: 600,
        taxPercent: 18,
        primaryUnit: 'hour',
        userId: req.user.userId
      }
    ];

    // Save sample items
    const savedItems = await Item.insertMany(sampleItems);

    res.json({
      message: 'Bulk upload completed successfully',
      itemsAdded: savedItems.length,
      items: savedItems
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(400).json({ message: 'Error processing bulk upload', error: error.message });
  }
});

// Inventory API Routes
// Get all inventory items
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', lowStock = false } = req.query;
    const skip = (page - 1) * limit;

    let query = { userId: req.user.userId };
    
    if (search) {
      query.$or = [
        { 'itemId.itemName': { $regex: search, $options: 'i' } },
        { 'itemId.description': { $regex: search, $options: 'i' } }
      ];
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$currentStock', '$reorderPoint'] };
    }

    const inventory = await Inventory.find(query)
      .populate('itemId', 'itemName description itemType sellingPrice primaryUnit')
      .sort({ currentStock: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Inventory.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.json({
      inventory,
      pagination: {
        current: parseInt(page),
        pages,
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory', error: error.message });
  }
});

// Get single inventory item
app.get('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    }).populate('itemId', 'itemName description itemType sellingPrice primaryUnit');

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory item', error: error.message });
  }
});

// Manual stock in
app.post('/api/inventory/stock-in', authenticateToken, async (req, res) => {
  try {
    const { itemId, quantity, reason, notes } = req.body;

    let inventory = await Inventory.findOne({ 
      userId: req.user.userId, 
      itemId: itemId 
    });

    if (!inventory) {
      // Create new inventory record
      inventory = new Inventory({
        userId: req.user.userId,
        itemId: itemId,
        currentStock: 0,
        reservedStock: 0
      });
    }

    // Add stock movement
    inventory.movements.push({
      itemId: itemId,
      movementType: 'stock_in',
      quantity: quantity,
      referenceType: 'manual',
      reason: reason,
      notes: notes
    });

    // Update current stock
    inventory.currentStock += quantity;
    await inventory.save();

    res.json({ message: 'Stock added successfully', inventory });
  } catch (error) {
    res.status(400).json({ message: 'Error adding stock', error: error.message });
  }
});

// Manual stock out
app.post('/api/inventory/stock-out', authenticateToken, async (req, res) => {
  try {
    const { itemId, quantity, reason, notes } = req.body;

    const inventory = await Inventory.findOne({ 
      userId: req.user.userId, 
      itemId: itemId 
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    if (inventory.currentStock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Add stock movement
    inventory.movements.push({
      itemId: itemId,
      movementType: 'stock_out',
      quantity: quantity,
      referenceType: 'manual',
      reason: reason,
      notes: notes
    });

    // Update current stock
    inventory.currentStock -= quantity;
    await inventory.save();

    res.json({ message: 'Stock removed successfully', inventory });
  } catch (error) {
    res.status(400).json({ message: 'Error removing stock', error: error.message });
  }
});

// Bulk stock operations
app.post('/api/inventory/bulk-operation', authenticateToken, async (req, res) => {
  try {
    const { operation, items } = req.body; // operation: 'stock_in' or 'stock_out'

    const results = [];
    
    for (const item of items) {
      let inventory = await Inventory.findOne({ 
        userId: req.user.userId, 
        itemId: item.itemId 
      });

      if (!inventory) {
        if (operation === 'stock_in') {
          inventory = new Inventory({
            userId: req.user.userId,
            itemId: item.itemId,
            currentStock: 0,
            reservedStock: 0
          });
        } else {
          results.push({ itemId: item.itemId, error: 'Item not found in inventory' });
          continue;
        }
      }

      if (operation === 'stock_out' && inventory.currentStock < item.quantity) {
        results.push({ itemId: item.itemId, error: 'Insufficient stock' });
        continue;
      }

      // Add stock movement
      inventory.movements.push({
        itemId: item.itemId,
        movementType: operation,
        quantity: item.quantity,
        referenceType: 'manual',
        reason: item.reason || 'Bulk operation',
        notes: item.notes
      });

      // Update current stock
      if (operation === 'stock_in') {
        inventory.currentStock += item.quantity;
      } else {
        inventory.currentStock -= item.quantity;
      }

      await inventory.save();
      results.push({ itemId: item.itemId, success: true });
    }

    res.json({ message: 'Bulk operation completed', results });
  } catch (error) {
    res.status(400).json({ message: 'Error in bulk operation', error: error.message });
  }
});

// Get inventory statistics
app.get('/api/inventory/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await Inventory.aggregate([
      { $match: { userId: req.user.userId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          lowStockItems: {
            $sum: { $cond: [{ $lte: ['$currentStock', '$reorderPoint'] }, 1, 0] }
          },
          outOfStockItems: {
            $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      totalItems: 0,
      totalStock: 0,
      lowStockItems: 0,
      outOfStockItems: 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory statistics', error: error.message });
  }
});

// Payment API Routes
// Get all payments/ledgers
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', customerId = '', status = '', paymentType = '', startDate = '', endDate = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = { userId: req.user.userId };
    
    if (search) {
      query.$or = [
        { paymentNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (status) {
      query.status = status;
    }

    if (paymentType) {
      query.paymentType = paymentType;
    }

    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(query)
      .populate('customerId', 'name email phone address')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.json({
      payments,
      pagination: {
        current: parseInt(page),
        pages,
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments', error: error.message });
  }
});

// Get customer statements
app.get('/api/payments/customer/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { startDate = '', endDate = '' } = req.query;

    let query = { 
      userId: req.user.userId, 
      customerId: customerId 
    };

    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(query)
      .populate('customerId', 'name email phone address')
      .sort({ paymentDate: -1 });

    // Calculate customer balance
    const balance = payments.reduce((total, payment) => {
      if (payment.paymentType === 'Received') {
        return total + payment.amount;
      } else {
        return total - payment.amount;
      }
    }, 0);

    res.json({
      payments,
      balance,
      customer: payments[0]?.customerId || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer statements', error: error.message });
  }
});

// Get payment timeline
app.get('/api/payments/timeline', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query;

    let query = { userId: req.user.userId };

    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(query)
      .populate('customerId', 'name email phone')
      .sort({ paymentDate: -1 });

    // Group by date
    const timeline = payments.reduce((acc, payment) => {
      const date = payment.paymentDate.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(payment);
      return acc;
    }, {});

    res.json({ timeline });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment timeline', error: error.message });
  }
});

// Create payment
app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    console.log('Create payment API called by user:', req.user.userId);
    console.log('Request body:', req.body);
    
    const {
      customerId,
      paymentDate,
      amount,
      paymentMethod,
      paymentType,
      referenceType,
      referenceNumber,
      description,
      notes,
      bankDetails
    } = req.body;

    // Validate required fields
    if (!customerId || !amount || !paymentMethod || !paymentType) {
      console.log('Missing required fields:', {
        customerId: !!customerId,
        amount: !!amount,
        paymentMethod: !!paymentMethod,
        paymentType: !!paymentType
      });
      return res.status(400).json({ 
        message: 'Missing required fields: customerId, amount, paymentMethod, paymentType' 
      });
    }

    const paymentData = {
      userId: req.user.userId,
      customerId,
      paymentDate: new Date(paymentDate),
      amount: Number(amount),
      paymentMethod,
      paymentType,
      referenceType: referenceType || 'manual',
      referenceNumber,
      description,
      notes,
      bankDetails: bankDetails && bankDetails.bankName ? bankDetails : undefined
    };

    console.log('Payment data:', paymentData);
    const payment = new Payment(paymentData);
    
    // Ensure payment number is generated
    if (!payment.paymentNumber) {
      const prefix = payment.paymentType === 'Received' ? 'REC' : 'PAY';
      const count = await Payment.countDocuments({ 
        userId: req.user.userId, 
        paymentType: payment.paymentType 
      });
      payment.paymentNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Manually generated payment number:', payment.paymentNumber);
    }
    
    await payment.save();

    // Trigger analytics update
    AnalyticsService.triggerUpdate(req.user.userId).catch(console.error);

    await payment.populate('customerId', 'name email phone address');

    console.log('Payment created successfully:', payment._id);
    res.status(201).json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Error creating payment', error: error.message });
  }
});

// Get payment statistics
app.get('/api/payments/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query;
    
    let matchQuery = { userId: req.user.userId };
    
    if (startDate && endDate) {
      matchQuery.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalReceived: {
            $sum: { $cond: [{ $eq: ['$paymentType', 'Received'] }, '$amount', 0] }
          },
          totalPaid: {
            $sum: { $cond: [{ $eq: ['$paymentType', 'Paid'] }, '$amount', 0] }
          },
          totalPayments: { $sum: 1 },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      totalReceived: 0,
      totalPaid: 0,
      totalPayments: 0,
      pendingPayments: 0,
      completedPayments: 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment statistics', error: error.message });
  }
});

// Download customer statement
app.get('/api/payments/customer/:customerId/download', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { startDate = '', endDate = '' } = req.query;

    let query = { 
      userId: req.user.userId, 
      customerId: customerId 
    };

    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(query)
      .populate('customerId', 'name email phone address')
      .sort({ paymentDate: -1 });

    // Generate CSV content
    const csvHeader = 'Date,Payment #,Type,Amount,Method,Status,Description,Reference\n';
    const csvRows = payments.map(payment => {
      return [
        payment.paymentDate.toISOString().split('T')[0],
        payment.paymentNumber,
        payment.paymentType,
        payment.amount,
        payment.paymentMethod,
        payment.status,
        payment.description || '',
        payment.referenceNumber || ''
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="customer-statement-${customerId}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading statement', error: error.message });
  }
});

// Bulk upload customers from Excel
app.post('/api/customers/bulk-upload', authenticateToken, async (req, res) => {
  try {
    console.log('Bulk customer upload request received');
    
    // Simulate processing Excel data
    const sampleCustomers = [
      {
        name: 'ABC Corporation',
        email: 'contact@abccorp.com',
        phone: '+91-9876543210',
        address: '123 Business Street, Mumbai, Maharashtra 400001',
        gstin: '27ABCDE1234F1Z5',
        companyName: 'ABC Corporation',
        userId: req.user.userId
      },
      {
        name: 'XYZ Industries',
        email: 'info@xyzindustries.com',
        phone: '+91-9876543211',
        address: '456 Industrial Area, Delhi, Delhi 110001',
        gstin: '07XYZAB5678G2H6',
        companyName: 'XYZ Industries',
        userId: req.user.userId
      },
      {
        name: 'Tech Solutions Ltd',
        email: 'hello@techsolutions.com',
        phone: '+91-9876543212',
        address: '789 Tech Park, Bangalore, Karnataka 560001',
        gstin: '29TECHS1234I3J7',
        companyName: 'Tech Solutions Ltd',
        userId: req.user.userId
      }
    ];

    // Save sample customers
    const savedCustomers = await Customer.insertMany(sampleCustomers);

    res.json({
      message: 'Bulk customer upload completed successfully',
      customersAdded: savedCustomers.length,
      customers: savedCustomers
    });
  } catch (error) {
    console.error('Bulk customer upload error:', error);
    res.status(400).json({ message: 'Error processing bulk customer upload', error: error.message });
  }
});

// Bulk upload vendors from Excel
app.post('/api/vendors/bulk-upload', authenticateToken, async (req, res) => {
  try {
    console.log('Bulk vendor upload request received');
    
    // Simulate processing Excel data
    const sampleVendors = [
      {
        name: 'Supplier One Pvt Ltd',
        email: 'orders@supplierone.com',
        phone: '+91-9876543213',
        address: '321 Supply Street, Chennai, Tamil Nadu 600001',
        gstin: '33SUPPL1234K4L8',
        companyName: 'Supplier One Pvt Ltd',
        contactPerson: 'John Doe',
        userId: req.user.userId
      },
      {
        name: 'Material Suppliers Inc',
        email: 'sales@materialsuppliers.com',
        phone: '+91-9876543214',
        address: '654 Material Road, Pune, Maharashtra 411001',
        gstin: '27MATER5678M5N9',
        companyName: 'Material Suppliers Inc',
        contactPerson: 'Jane Smith',
        userId: req.user.userId
      },
      {
        name: 'Service Providers Co',
        email: 'contact@serviceproviders.com',
        phone: '+91-9876543215',
        address: '987 Service Lane, Hyderabad, Telangana 500001',
        gstin: '36SERVI9012O6P0',
        companyName: 'Service Providers Co',
        contactPerson: 'Mike Johnson',
        userId: req.user.userId
      }
    ];

    // Save sample vendors
    const savedVendors = await Vendor.insertMany(sampleVendors);

    res.json({
      message: 'Bulk vendor upload completed successfully',
      vendorsAdded: savedVendors.length,
      vendors: savedVendors
    });
  } catch (error) {
    console.error('Bulk vendor upload error:', error);
    res.status(400).json({ message: 'Error processing bulk vendor upload', error: error.message });
  }
});

// Download customers list as CSV
app.get('/api/customers/download', authenticateToken, async (req, res) => {
  try {
    const customers = await Customer.find({ userId: req.user.userId })
      .sort({ name: 1 });

    // Generate CSV content
    const csvHeader = 'Name,Email,Phone,Address,GST Number,PAN Number,Company Name,Notes,Created Date\n';
    const csvRows = customers.map(customer => {
      const address = customer.address ? 
        `${customer.address.street || ''}, ${customer.address.city || ''}, ${customer.address.state || ''} ${customer.address.pincode || ''}`.trim() : '';
      
      return [
        customer.name || '',
        customer.email || '',
        customer.phone || '',
        address,
        customer.gstNumber || '',
        customer.panNumber || '',
        customer.companyName || '',
        customer.notes || '',
        new Date(customer.createdAt).toLocaleDateString()
      ].map(field => `"${field}"`).join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading customers', error: error.message });
  }
});

// Download vendors list as CSV
app.get('/api/vendors/download', authenticateToken, async (req, res) => {
  try {
    const vendors = await Vendor.find({ userId: req.user.userId })
      .sort({ name: 1 });

    // Generate CSV content
    const csvHeader = 'Name,Email,Phone,Address,GST Number,PAN Number,Company Name,Contact Person,Notes,Created Date\n';
    const csvRows = vendors.map(vendor => {
      const address = vendor.address ? 
        `${vendor.address.street || ''}, ${vendor.address.city || ''}, ${vendor.address.state || ''} ${vendor.address.pincode || ''}`.trim() : '';
      
      return [
        vendor.name || '',
        vendor.email || '',
        vendor.phone || '',
        address,
        vendor.gstNumber || '',
        vendor.panNumber || '',
        vendor.companyName || '',
        vendor.contactPerson || '',
        vendor.notes || '',
        new Date(vendor.createdAt).toLocaleDateString()
      ].map(field => `"${field}"`).join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vendors-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading vendors', error: error.message });
  }
});

// Vendor API Routes
// Get all vendors
app.get('/api/vendors', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = { userId: req.user.userId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }

    const vendors = await Vendor.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vendor.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.json({
      vendors,
      pagination: {
        current: parseInt(page),
        pages,
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendors', error: error.message });
  }
});

// Get single vendor
app.get('/api/vendors/:id', authenticateToken, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor', error: error.message });
  }
});

// Create vendor
app.post('/api/vendors', authenticateToken, async (req, res) => {
  try {
    const vendorData = {
      ...req.body,
      userId: req.user.userId
    };

    const vendor = new Vendor(vendorData);
    await vendor.save();

    res.status(201).json(vendor);
  } catch (error) {
    res.status(400).json({ message: 'Error creating vendor', error: error.message });
  }
});

// Update vendor
app.put('/api/vendors/:id', authenticateToken, async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    res.status(400).json({ message: 'Error updating vendor', error: error.message });
  }
});

// Delete vendor
app.delete('/api/vendors/:id', authenticateToken, async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting vendor', error: error.message });
  }
});

// Analytics API Routes
// Get comprehensive analytics data
app.get('/api/analytics/overview', authenticateToken, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    console.log(`Fetching analytics overview for user ${req.user.userId}, period: ${period}`);
    
    // Get analytics data from service
    const analytics = await AnalyticsService.getAnalytics(req.user.userId, period);
    
    if (!analytics) {
      console.log('No analytics data found, creating empty response');
      return res.json({
        totalSales: 0,
        totalPurchases: 0,
        totalExpenses: 0,
        netProfit: 0,
        paymentMethods: [],
        salesByDate: [],
        lastUpdated: new Date()
      });
    }
    
    // Return overview data
    const response = {
      totalSales: analytics.totalSales || 0,
      totalPurchases: analytics.totalPurchases || 0,
      totalExpenses: analytics.totalExpenses || 0,
      netProfit: analytics.netProfit || 0,
      paymentMethods: (analytics.paymentMethods || []).map(pm => ({
        _id: pm.method || 'Unknown',
        total: pm.total || 0,
        count: pm.count || 0
      })),
      salesByDate: (analytics.salesByDate || []).map(sd => ({
        _id: sd.date || new Date().toISOString().split('T')[0],
        total: sd.sales || 0,
        count: sd.orders || 0
      })),
      lastUpdated: analytics.lastUpdated || new Date()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ message: 'Error fetching analytics overview', error: error.message });
  }
});

// Get top selling products from analytics
app.get('/api/analytics/top-products', authenticateToken, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    console.log(`Fetching top products for user ${req.user.userId}, period: ${period}`);
    
    const analytics = await AnalyticsService.getAnalytics(req.user.userId, period);
    
    if (!analytics) {
      console.log('No analytics data found for top products');
      return res.json([]);
    }
    
    // Return top products in the expected format
    const topProducts = (analytics.topProducts || []).map(product => ({
      _id: product.productName || 'Unknown Product',
      totalQuantity: product.totalQuantity || 0,
      totalAmount: product.totalAmount || 0,
      count: product.orderCount || 0
    }));
    
    console.log('Returning top products:', topProducts);
    res.json(topProducts);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ message: 'Error fetching top products', error: error.message });
  }
});

// Get top customers from analytics
app.get('/api/analytics/top-customers', authenticateToken, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    const analytics = await AnalyticsService.getAnalytics(req.user.userId, period);
    
    if (!analytics) {
      return res.json([]);
    }
    
    // Return top customers in the expected format
    const topCustomers = (analytics.topCustomers || []).map(customer => ({
      _id: customer.customerName || 'Unknown Customer',
      totalAmount: customer.totalAmount || 0,
      invoiceCount: customer.invoiceCount || 0,
      avgOrderValue: customer.avgOrderValue || 0
    }));
    
    res.json(topCustomers);
  } catch (error) {
    console.error('Error fetching top customers:', error);
    res.status(500).json({ message: 'Error fetching top customers', error: error.message });
  }
});

// Get payment analytics from stored data
app.get('/api/analytics/payments', authenticateToken, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    const analytics = await AnalyticsService.getAnalytics(req.user.userId, period);
    
    if (!analytics) {
      return res.json({
        paymentFlow: [],
        paymentMethods: [],
        dailyPayments: []
      });
    }
    
    // Format payment flow data
    const paymentFlow = [
      {
        _id: 'Received',
        total: analytics.paymentFlow?.moneyIn?.total || 0,
        count: analytics.paymentFlow?.moneyIn?.count || 0
      },
      {
        _id: 'Paid',
        total: analytics.paymentFlow?.moneyOut?.total || 0,
        count: analytics.paymentFlow?.moneyOut?.count || 0
      }
    ];
    
    // Format payment methods
    const paymentMethods = (analytics.paymentMethods || []).map(pm => ({
      _id: pm.method || 'Unknown',
      total: pm.total || 0,
      count: pm.count || 0
    }));
    
    // Format daily payments
    const dailyPayments = (analytics.dailyPayments || []).map(dp => ({
      _id: dp.date || new Date().toISOString().split('T')[0],
      received: dp.received || 0,
      paid: dp.paid || 0
    }));
    
    res.json({
      paymentFlow,
      paymentMethods,
      dailyPayments
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({ message: 'Error fetching payment analytics', error: error.message });
  }
});

// Manually trigger analytics update
app.post('/api/analytics/update', authenticateToken, async (req, res) => {
  try {
    const { period = '30days' } = req.body;
    
    const analytics = await AnalyticsService.updateAnalytics(req.user.userId, period);
    
    res.json({
      message: 'Analytics updated successfully',
      lastUpdated: analytics.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating analytics', error: error.message });
  }
});

// Clear all analytics cache for user (removes fake/cached data)
app.delete('/api/analytics/clear', authenticateToken, async (req, res) => {
  try {
    await AnalyticsService.clearAnalytics(req.user.userId);
    
    res.json({
      message: 'Analytics cache cleared successfully. Analytics will be recalculated on next request.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing analytics', error: error.message });
  }
});

// Get all analytics data for dashboard
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    const analytics = await AnalyticsService.getAnalytics(req.user.userId, period);
    
    if (!analytics) {
      return res.status(404).json({ message: 'No analytics data found' });
    }
    
    res.json({
      overview: {
        totalSales: analytics.totalSales,
        totalPurchases: analytics.totalPurchases,
        totalExpenses: analytics.totalExpenses,
        netProfit: analytics.netProfit
      },
      kpis: analytics.kpis,
      topProducts: analytics.topProducts,
      topCustomers: analytics.topCustomers,
      paymentMethods: analytics.paymentMethods,
      salesTrends: analytics.salesByDate,
      paymentFlow: analytics.paymentFlow,
      dailyPayments: analytics.dailyPayments,
      lastUpdated: analytics.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard analytics', error: error.message });
  }
});

// ===== Real-time Analytics Stream (SSE) =====
try {
  const { analyticsEvents } = require('./services/analyticsService');

  app.get('/api/analytics/stream', authenticateToken, async (req, res) => {
    // Headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const { period = '30days' } = req.query;
    const userId = req.user.userId?.toString?.() || req.user.userId;

    let isClosed = false;
    req.on('close', () => {
      isClosed = true;
      analyticsEvents.removeListener('analytics:update', onUpdate);
      analyticsEvents.removeListener('analytics:bulkUpdate', onBulkUpdate);
      try { res.end(); } catch (_) {}
    });

    const sendEvent = (event, data) => {
      if (isClosed) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Immediately send latest snapshot for the requested period
    try {
      const snapshot = await AnalyticsService.getAnalytics(userId, period);
      sendEvent('snapshot', { period, analytics: snapshot });
    } catch (e) {
      sendEvent('error', { message: 'Failed to load initial analytics snapshot' });
    }

    // Event handlers
    const onUpdate = async (payload) => {
      if (!payload || payload.userId !== userId) return;
      const updatedPeriod = payload.period || period;
      // If the update matches the subscribed period, push fresh data
      if (updatedPeriod === period) {
        try {
          const fresh = await AnalyticsService.getAnalytics(userId, period);
          sendEvent('update', { period, analytics: fresh, lastUpdated: new Date() });
        } catch (e) {
          sendEvent('error', { message: 'Failed to refresh analytics' });
        }
      }
    };

    const onBulkUpdate = async (payload) => {
      if (!payload || payload.userId !== userId) return;
      if (Array.isArray(payload.periods) && payload.periods.includes(period)) {
        try {
          const fresh = await AnalyticsService.getAnalytics(userId, period);
          sendEvent('update', { period, analytics: fresh, lastUpdated: new Date() });
        } catch (e) {
          sendEvent('error', { message: 'Failed to refresh analytics' });
        }
      }
    };

    analyticsEvents.on('analytics:update', onUpdate);
    analyticsEvents.on('analytics:bulkUpdate', onBulkUpdate);
  });
} catch (e) {
  console.error('Failed to initialize analytics SSE stream:', e);
}

// Get sales trends
app.get('/api/insights/sales-trends', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const salesTrends = await Invoice.aggregate([
      {
        $match: {
          userId: req.user.userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalSales: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(salesTrends);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales trends', error: error.message });
  }
});

// Reports API Routes
// Get comprehensive business report
app.get('/api/reports/business-summary', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Sales Summary
    const salesSummary = await Invoice.aggregate([
      { $match: { userId: req.user.userId, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalSales: { $sum: '$totalAmount' },
          totalTax: { $sum: '$taxAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Purchase Summary
    const purchaseSummary = await Purchase.aggregate([
      { $match: { userId: req.user.userId, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          avgPurchaseValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Expense Summary
    const expenseSummary = await Expense.aggregate([
      { $match: { userId: req.user.userId, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgExpenseValue: { $avg: '$amount' }
        }
      }
    ]);

    // Payment Summary
    const paymentSummary = await Payment.aggregate([
      { $match: { userId: req.user.userId, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalReceived: {
            $sum: { $cond: [{ $eq: ['$paymentType', 'Received'] }, '$amount', 0] }
          },
          totalPaid: {
            $sum: { $cond: [{ $eq: ['$paymentType', 'Paid'] }, '$amount', 0] }
          }
        }
      }
    ]);

    res.json({
      sales: salesSummary[0] || { totalInvoices: 0, totalSales: 0, totalTax: 0, avgOrderValue: 0 },
      purchases: purchaseSummary[0] || { totalPurchases: 0, totalAmount: 0, avgPurchaseValue: 0 },
      expenses: expenseSummary[0] || { totalExpenses: 0, totalAmount: 0, avgExpenseValue: 0 },
      payments: paymentSummary[0] || { totalPayments: 0, totalReceived: 0, totalPaid: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating business report', error: error.message });
  }
});

// Download business report as Excel
app.get('/api/reports/business-summary/excel', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Get all invoices
    const invoices = await Invoice.find({ userId: req.user.userId, ...dateFilter })
      .populate('companyId', 'businessName companyName')
      .sort({ createdAt: -1 });

    // Generate Excel content
    const csvHeader = 'Invoice #,Date,Customer,Amount,Tax,Total,Status,Company\n';
    const csvRows = invoices.map(invoice => {
      return [
        invoice.invoiceNumber || '',
        new Date(invoice.createdAt).toLocaleDateString(),
        invoice.customerName || '',
        invoice.subtotal || 0,
        invoice.taxAmount || 0,
        invoice.totalAmount || 0,
        invoice.status || '',
        invoice.companyId?.businessName || ''
      ].map(field => `"${field}"`).join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="business-summary-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading business report', error: error.message });
  }
});

// Sales Report
app.get('/api/reports/sales', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '', format = 'json' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const invoices = await Invoice.find({ userId: req.user.userId, ...dateFilter })
      .populate('companyId', 'businessName gstin')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const csvHeader = 'Invoice #,Date,Customer,Customer GSTIN,Amount,Tax,Total,Status,Payment Method,Company\n';
      const csvRows = invoices.map(invoice => {
        return [
          invoice.invoiceNumber || '',
          new Date(invoice.createdAt).toLocaleDateString(),
          invoice.customerName || '',
          invoice.customerGSTIN || '',
          invoice.subtotal || 0,
          invoice.taxAmount || 0,
          invoice.totalAmount || 0,
          invoice.status || '',
          invoice.paymentMethod || '',
          invoice.companyId?.businessName || ''
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    res.json({
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      totalTax: invoices.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0),
      invoices: invoices
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating sales report', error: error.message });
  }
});

// Credit Notes Report
app.get('/api/reports/credit-notes', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '', format = 'json' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const creditNotes = await CreditNote.find({ userId: req.user.userId, ...dateFilter })
      .populate('companyId', 'businessName gstin')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const csvHeader = 'Credit Note #,Date,Customer,Customer GSTIN,Original Invoice,Amount,Tax,Total,Status,Reason,Company\n';
      const csvRows = creditNotes.map(cn => {
        return [
          cn.creditNoteNumber || '',
          new Date(cn.createdAt).toLocaleDateString(),
          cn.customerName || '',
          cn.customerGSTIN || '',
          cn.originalInvoiceNumber || '',
          cn.subtotal || 0,
          cn.taxAmount || 0,
          cn.totalAmount || 0,
          cn.status || '',
          cn.reason || '',
          cn.companyId?.businessName || ''
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="credit-notes-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    res.json({
      totalCreditNotes: creditNotes.length,
      totalAmount: creditNotes.reduce((sum, cn) => sum + (cn.totalAmount || 0), 0),
      totalTax: creditNotes.reduce((sum, cn) => sum + (cn.taxAmount || 0), 0),
      creditNotes: creditNotes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating credit notes report', error: error.message });
  }
});

// Debit Notes Report
app.get('/api/reports/debit-notes', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '', format = 'json' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const debitNotes = await DebitNote.find({ userId: req.user.userId, ...dateFilter })
      .populate('companyId', 'businessName gstin')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const csvHeader = 'Debit Note #,Date,Vendor,Vendor GSTIN,Original Purchase,Amount,Tax,Total,Status,Reason,Company\n';
      const csvRows = debitNotes.map(dn => {
        return [
          dn.debitNoteNumber || '',
          new Date(dn.createdAt).toLocaleDateString(),
          dn.vendorName || '',
          dn.vendorGSTIN || '',
          dn.originalPurchaseNumber || '',
          dn.subtotal || 0,
          dn.taxAmount || 0,
          dn.totalAmount || 0,
          dn.status || '',
          dn.reason || '',
          dn.companyId?.businessName || ''
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="debit-notes-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    res.json({
      totalDebitNotes: debitNotes.length,
      totalAmount: debitNotes.reduce((sum, dn) => sum + (dn.totalAmount || 0), 0),
      totalTax: debitNotes.reduce((sum, dn) => sum + (dn.taxAmount || 0), 0),
      debitNotes: debitNotes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating debit notes report', error: error.message });
  }
});

// Purchase Report
app.get('/api/reports/purchases', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '', format = 'json' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const purchases = await Purchase.find({ userId: req.user.userId, ...dateFilter })
      .populate('companyId', 'businessName gstin')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const csvHeader = 'Purchase #,Date,Vendor,Vendor GSTIN,Amount,Tax,Total,Status,Payment Method,Company\n';
      const csvRows = purchases.map(purchase => {
        return [
          purchase.purchaseNumber || '',
          new Date(purchase.createdAt).toLocaleDateString(),
          purchase.vendorName || '',
          purchase.vendorGSTIN || '',
          purchase.subtotal || 0,
          purchase.taxAmount || 0,
          purchase.totalAmount || 0,
          purchase.status || '',
          purchase.paymentMethod || '',
          purchase.companyId?.businessName || ''
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="purchases-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    res.json({
      totalPurchases: purchases.length,
      totalAmount: purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
      totalTax: purchases.reduce((sum, p) => sum + (p.taxAmount || 0), 0),
      purchases: purchases
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating purchases report', error: error.message });
  }
});

// Quotation Report
app.get('/api/reports/quotations', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '', format = 'json' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const quotations = await Quotation.find({ userId: req.user.userId, ...dateFilter })
      .populate('companyId', 'businessName gstin')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const csvHeader = 'Quotation #,Date,Customer,Customer GSTIN,Amount,Tax,Total,Status,Valid Until,Company\n';
      const csvRows = quotations.map(quote => {
        return [
          quote.quotationNumber || '',
          new Date(quote.createdAt).toLocaleDateString(),
          quote.customerName || '',
          quote.customerGSTIN || '',
          quote.subtotal || 0,
          quote.taxAmount || 0,
          quote.totalAmount || 0,
          quote.status || '',
          quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '',
          quote.companyId?.businessName || ''
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="quotations-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    res.json({
      totalQuotations: quotations.length,
      totalAmount: quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0),
      totalTax: quotations.reduce((sum, q) => sum + (q.taxAmount || 0), 0),
      quotations: quotations
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating quotations report', error: error.message });
  }
});

// Expense Report
app.get('/api/reports/expenses', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '', format = 'json' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const expenses = await Expense.find({ userId: req.user.userId, ...dateFilter })
      .populate('companyId', 'businessName gstin')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const csvHeader = 'Expense #,Date,Category,Description,Amount,Payment Type,Status,Paid,Company\n';
      const csvRows = expenses.map(expense => {
        return [
          expense.expenseNumber || '',
          new Date(expense.createdAt).toLocaleDateString(),
          expense.category || '',
          expense.description || '',
          expense.amount || 0,
          expense.paymentType || '',
          expense.status || '',
          expense.isPaid ? 'Yes' : 'No',
          expense.companyId?.businessName || ''
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="expenses-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    res.json({
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      expenses: expenses
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating expenses report', error: error.message });
  }
});

// Enhanced GSTR-1 Report (GetSwipe Format)
app.get('/api/reports/gstr-1', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const invoices = await Invoice.find({ userId: req.user.userId, ...dateFilter })
      .populate('companyId', 'businessName gstin')
      .sort({ createdAt: 1 });

    const creditNotes = await CreditNote.find({ userId: req.user.userId, ...dateFilter });

    // GetSwipe Format GSTR-1
    const gstr1Data = {
      gstin: invoices[0]?.companyId?.gstin || '',
      ret_period: `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      b2b: invoices.filter(inv => inv.customerGSTIN).map(invoice => ({
        ctin: invoice.customerGSTIN,
        inv: {
          inum: invoice.invoiceNumber,
          idt: new Date(invoice.createdAt).toISOString().split('T')[0],
          val: invoice.totalAmount,
          pos: invoice.customerAddress?.state || '',
          rchrg: 'N',
          inv_typ: 'R',
          rt: invoice.taxRate || 18,
          elg: 'Y',
          items: invoice.items.map((item, index) => ({
            num: index + 1,
            hsn_sc: item.hsnCode || '999999',
            qty: item.quantity,
            rt: item.taxPercent || 18,
            txval: item.netAmount,
            iamt: item.taxAmount,
            csamt: 0
          }))
        }
      })),
      b2cl: invoices.filter(inv => !inv.customerGSTIN && inv.totalAmount > 250000).map(invoice => ({
        pos: invoice.customerAddress?.state || '',
        etin: '',
        inv: {
          inum: invoice.invoiceNumber,
          idt: new Date(invoice.createdAt).toISOString().split('T')[0],
          val: invoice.totalAmount,
          items: invoice.items.map((item, index) => ({
            num: index + 1,
            hsn_sc: item.hsnCode || '999999',
            qty: item.quantity,
            rt: item.taxPercent || 18,
            txval: item.netAmount,
            iamt: item.taxAmount,
            csamt: 0
          }))
        }
      })),
      b2cs: invoices.filter(inv => !inv.customerGSTIN && inv.totalAmount <= 250000).map(invoice => ({
        pos: invoice.customerAddress?.state || '',
        etin: '',
        typ: 'B2CS',
        etin: '',
        rt: invoice.taxRate || 18,
        txval: invoice.subtotal,
        iamt: invoice.taxAmount,
        csamt: 0
      })),
      hsn: {
        data: Object.values(invoices.reduce((acc, invoice) => {
          invoice.items.forEach(item => {
            const hsn = item.hsnCode || '999999';
            if (!acc[hsn]) {
              acc[hsn] = {
                num: 1,
                hsn_sc: hsn,
                desc: item.description,
                uqc: 'PCS',
                qty: 0,
                rt: item.taxPercent || 18,
                txval: 0,
                iamt: 0,
                csamt: 0
              };
            }
            acc[hsn].qty += item.quantity;
            acc[hsn].txval += item.netAmount;
            acc[hsn].iamt += item.taxAmount;
          });
          return acc;
        }, {}))
      },
      cdnr: creditNotes.map(cn => ({
        ctin: cn.customerGSTIN || '',
        nt: {
          ntty: 'C',
          nt_num: cn.creditNoteNumber,
          nt_dt: new Date(cn.createdAt).toISOString().split('T')[0],
          rsn: cn.reason,
          p_gst: 'Y',
          inum: cn.originalInvoiceNumber,
          idt: new Date(cn.createdAt).toISOString().split('T')[0],
          val: cn.totalAmount,
          rt: cn.taxRate || 18,
          iamt: cn.taxAmount,
          csamt: 0
        }
      }))
    };

    res.json(gstr1Data);
  } catch (error) {
    res.status(500).json({ message: 'Error generating GSTR-1', error: error.message });
  }
});

// GSTR-2B Report (Auto-drafted ITC Statement)
app.get('/api/reports/gstr-2b', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const purchases = await Purchase.find({ userId: req.user.userId, ...dateFilter })
      .populate('companyId', 'businessName gstin')
      .sort({ createdAt: 1 });

    const gstr2bData = {
      gstin: purchases[0]?.companyId?.gstin || '',
      ret_period: `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      itc_avl: {
        itc_avl: purchases.map(purchase => ({
          ty: 'GST',
          rt: purchase.taxAmount || 0,
          iamt: purchase.taxAmount || 0,
          csamt: 0,
          ciamt: 0,
          srt: 0,
          samt: 0,
          csrt: 0,
          cscrt: 0
        }))
      },
      itc_rev: [],
      itc_net: {
        itc_avl: purchases.reduce((total, purchase) => total + (purchase.taxAmount || 0), 0),
        itc_rev: 0,
        itc_net: purchases.reduce((total, purchase) => total + (purchase.taxAmount || 0), 0)
      }
    };

    res.json(gstr2bData);
  } catch (error) {
    res.status(500).json({ message: 'Error generating GSTR-2B', error: error.message });
  }
});

// GSTR-3B Report (Monthly Return)
app.get('/api/reports/gstr-3b', authenticateToken, async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const invoices = await Invoice.find({ userId: req.user.userId, ...dateFilter });
    const purchases = await Purchase.find({ userId: req.user.userId, ...dateFilter });

    const totalOutwardSupplies = invoices.reduce((total, invoice) => total + (invoice.totalAmount || 0), 0);
    const totalInwardSupplies = purchases.reduce((total, purchase) => total + (purchase.totalAmount || 0), 0);
    const totalTaxOnOutward = invoices.reduce((total, invoice) => total + (invoice.taxAmount || 0), 0);
    const totalTaxOnInward = purchases.reduce((total, purchase) => total + (purchase.taxAmount || 0), 0);

    const gstr3bData = {
      gstin: invoices[0]?.companyId?.gstin || '',
      ret_period: `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      sup_details: {
        osup_det: {
          txval: totalOutwardSupplies,
          iamt: totalTaxOnOutward,
          csamt: 0
        },
        osup_zero: {
          txval: 0,
          iamt: 0,
          csamt: 0
        },
        osup_nil_exmp: {
          txval: 0,
          iamt: 0,
          csamt: 0
        },
        osup_noned: {
          txval: 0,
          iamt: 0,
          csamt: 0
        }
      },
      inter_sup: {
        unreg_details: [],
        comp_details: [],
        uin_details: []
      },
      itc_elg: {
        itc_avl: {
          iamt: totalTaxOnInward,
          csamt: 0,
          samt: 0,
          ciamt: 0,
          srt: 0,
          crt: 0,
          csrt: 0,
          cscrt: 0
        },
        itc_rev: {
          iamt: 0,
          csamt: 0,
          samt: 0,
          ciamt: 0,
          srt: 0,
          crt: 0,
          csrt: 0,
          cscrt: 0
        },
        itc_net: {
          iamt: totalTaxOnInward,
          csamt: 0,
          samt: 0,
          ciamt: 0,
          srt: 0,
          crt: 0,
          csrt: 0,
          cscrt: 0
        },
        itc_inelg: {
          iamt: 0,
          csamt: 0,
          samt: 0,
          ciamt: 0,
          srt: 0,
          crt: 0,
          csrt: 0,
          cscrt: 0
        }
      },
      inward_sup: {
        isup_details: {
          txval: totalInwardSupplies,
          iamt: totalTaxOnInward,
          csamt: 0
        }
      }
    };

    res.json(gstr3bData);
  } catch (error) {
    res.status(500).json({ message: 'Error generating GSTR-3B', error: error.message });
  }
});

// Online Store API Routes
// Get all stores for user
app.get('/api/stores', authenticateToken, async (req, res) => {
  try {
    const stores = await Store.find({ userId: req.user.userId })
      .populate('companyId', 'businessName companyName')
      .sort({ createdAt: -1 });

    res.json(stores);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stores', error: error.message });
  }
});

// Get store by ID
app.get('/api/stores/:id', authenticateToken, async (req, res) => {
  try {
    const store = await Store.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    }).populate('companyId', 'businessName companyName');

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    res.json(store);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching store', error: error.message });
  }
});

// Create new store
app.post('/api/stores', authenticateToken, async (req, res) => {
  try {
    const { storeName, storeDescription, companyId } = req.body;

    // Check if user already has a store
    const existingStore = await Store.findOne({ userId: req.user.userId });
    if (existingStore) {
      return res.status(400).json({ message: 'You already have a store. Upgrade to create multiple stores.' });
    }

    const store = new Store({
      userId: req.user.userId,
      companyId: companyId || req.user.companyId,
      storeName,
      storeDescription
    });

    await store.save();
    res.status(201).json(store);
  } catch (error) {
    res.status(400).json({ message: 'Error creating store', error: error.message });
  }
});

// Update store settings
app.put('/api/stores/:id', authenticateToken, async (req, res) => {
  try {
    const store = await Store.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    res.json(store);
  } catch (error) {
    res.status(400).json({ message: 'Error updating store', error: error.message });
  }
});

// Store Products API
// Get store products
app.get('/api/stores/:storeId/products', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12, category, status, search } = req.query;
    const skip = (page - 1) * limit;

    let filter = { storeId: req.params.storeId, userId: req.user.userId };
    
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await StoreProduct.find(filter)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StoreProduct.countDocuments(filter);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Add product to store
app.post('/api/stores/:storeId/products', authenticateToken, async (req, res) => {
  try {
    const { itemId, name, description, price, images, category, inventory } = req.body;

    const product = new StoreProduct({
      userId: req.user.userId,
      storeId: req.params.storeId,
      itemId,
      name,
      description,
      price,
      images: images || [],
      category,
      inventory: inventory || { trackInventory: true, quantity: 0 },
      status: 'draft'
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: 'Error adding product', error: error.message });
  }
});

// Update store product
app.put('/api/stores/:storeId/products/:productId', authenticateToken, async (req, res) => {
  try {
    const product = await StoreProduct.findOneAndUpdate(
      { _id: req.params.productId, storeId: req.params.storeId, userId: req.user.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: 'Error updating product', error: error.message });
  }
});

// Store Categories API
// Get store categories
app.get('/api/stores/:storeId/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await StoreCategory.find({ 
      storeId: req.params.storeId, 
      userId: req.user.userId,
      isActive: true 
    }).sort({ sortOrder: 1, name: 1 });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Create store category
app.post('/api/stores/:storeId/categories', authenticateToken, async (req, res) => {
  try {
    const { name, description, parentCategory, image } = req.body;

    const category = new StoreCategory({
      userId: req.user.userId,
      storeId: req.params.storeId,
      name,
      description,
      parentCategory,
      image
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: 'Error creating category', error: error.message });
  }
});

// Store Orders API
// Get store orders
app.get('/api/stores/:storeId/orders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const skip = (page - 1) * limit;

    let filter = { storeId: req.params.storeId, userId: req.user.userId };
    if (status) filter.status = status;
    if (paymentStatus) filter['payment.status'] = paymentStatus;

    const orders = await StoreOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StoreOrder.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Update order status
app.put('/api/stores/:storeId/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { status, fulfillment, notes } = req.body;

    const order = await StoreOrder.findOneAndUpdate(
      { _id: req.params.orderId, storeId: req.params.storeId, userId: req.user.userId },
      { 
        status, 
        fulfillment: fulfillment || {},
        'notes.internal': notes?.internal || order?.notes?.internal
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order', error: error.message });
  }
});

// Public Store API (for customer-facing store)
// Get public store info
app.get('/api/public/stores/:slug', async (req, res) => {
  try {
    const store = await Store.findOne({ 
      storeSlug: req.params.slug, 
      isPublished: true, 
      isActive: true 
    }).populate('companyId', 'businessName companyName');

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Increment view count
    await Store.findByIdAndUpdate(store._id, { 
      $inc: { 'analytics.totalViews': 1 },
      'analytics.lastViewed': new Date()
    });

    res.json(store);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching store', error: error.message });
  }
});

// Get public store products
app.get('/api/public/stores/:slug/products', async (req, res) => {
  try {
    const { page = 1, limit = 12, category, search } = req.query;
    const skip = (page - 1) * limit;

    const store = await Store.findOne({ 
      storeSlug: req.params.slug, 
      isPublished: true, 
      isActive: true 
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    let filter = { storeId: store._id, status: 'active' };
    
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await StoreProduct.find(filter)
      .populate('category', 'name')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StoreProduct.countDocuments(filter);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Get public store categories
app.get('/api/public/stores/:slug/categories', async (req, res) => {
  try {
    const store = await Store.findOne({ 
      storeSlug: req.params.slug, 
      isPublished: true, 
      isActive: true 
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const categories = await StoreCategory.find({ 
      storeId: store._id, 
      isActive: true 
    }).sort({ sortOrder: 1, name: 1 });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Create order (public endpoint)
app.post('/api/public/stores/:slug/orders', async (req, res) => {
  try {
    const { customer, items, shippingAddress, billingAddress, payment } = req.body;

    const store = await Store.findOne({ 
      storeSlug: req.params.slug, 
      isPublished: true, 
      isActive: true 
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await StoreProduct.findById(item.productId);
      if (!product || product.status !== 'active') {
        return res.status(400).json({ message: `Product ${item.productId} not available` });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });
    }

    const total = subtotal + (payment.shipping || 0) + (payment.tax || 0) - (payment.discount || 0);

    const order = new StoreOrder({
      userId: store.userId,
      storeId: store._id,
      customer,
      items: orderItems,
      shippingAddress,
      billingAddress,
      pricing: {
        subtotal,
        shipping: payment.shipping || 0,
        tax: payment.tax || 0,
        discount: payment.discount || 0,
        total
      },
      payment: {
        method: payment.method,
        status: payment.method === 'cod' ? 'pending' : 'paid',
        transactionId: payment.transactionId,
        gateway: payment.gateway
      }
    });

    await order.save();

    // Update store analytics
    await Store.findByIdAndUpdate(store._id, {
      $inc: { 
        'analytics.totalOrders': 1,
        'analytics.totalRevenue': total
      }
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error creating order', error: error.message });
  }
});

// AI Chatbot API Routes
// Get business data for AI analysis
app.get('/api/chatbot/data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch comprehensive business data
    const [
      invoices,
      customers,
      vendors,
      items,
      purchases,
      expenses,
      payments,
      inventory,
      companies
    ] = await Promise.all([
      Invoice.find({ userId }).select('invoiceNumber customerName totalAmount status createdAt').limit(50),
      Customer.find({ userId }).select('name email phone totalPurchases').limit(50),
      Vendor.find({ userId }).select('name email phone companyName').limit(50),
      Item.find({ userId }).select('name type price category').limit(50),
      Purchase.find({ userId }).select('purchaseNumber vendorName totalAmount status createdAt').limit(50),
      Expense.find({ userId }).select('amount category description date').limit(50),
      Payment.find({ userId }).select('amount paymentMethod paymentType status createdAt').limit(50),
      Inventory.find({ userId }).populate('itemId', 'name').select('currentStock availableStock itemId').limit(50),
      Company.find({ userId }).select('businessName companyName email phone address')
    ]);

    // Calculate business metrics
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPurchases = purchases.reduce((sum, pur) => sum + (pur.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalRevenue = totalSales - totalPurchases - totalExpenses;
    
    const salesByMonth = {};
    const topCustomers = {};
    const topProducts = {};
    
    // Analyze sales data
    invoices.forEach(invoice => {
      const month = new Date(invoice.createdAt).toISOString().slice(0, 7);
      salesByMonth[month] = (salesByMonth[month] || 0) + (invoice.totalAmount || 0);
      
      if (invoice.customerName) {
        topCustomers[invoice.customerName] = (topCustomers[invoice.customerName] || 0) + (invoice.totalAmount || 0);
      }
    });

    // Analyze inventory
    const lowStockItems = inventory.filter(inv => inv.currentStock <= 5);
    const outOfStockItems = inventory.filter(inv => inv.currentStock === 0);

    const businessData = {
      summary: {
        totalSales,
        totalPurchases,
        totalExpenses,
        totalRevenue,
        totalCustomers: customers.length,
        totalVendors: vendors.length,
        totalProducts: items.length,
        totalInvoices: invoices.length,
        totalOrders: purchases.length
      },
      recentActivity: {
        recentInvoices: invoices.slice(0, 10),
        recentCustomers: customers.slice(0, 10),
        recentPayments: payments.slice(0, 10)
      },
      analytics: {
        salesByMonth,
        topCustomers: Object.entries(topCustomers)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length
      },
      company: companies[0] || null
    };

    res.json(businessData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching business data', error: error.message });
  }
});

// AI Chatbot query processing
app.post('/api/chatbot/query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.id;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Get business data for context
    const businessDataResponse = await fetch(`http://localhost:${PORT}/api/chatbot/data`, {
      headers: { Authorization: `Bearer ${req.headers.authorization}` }
    });
    const businessData = await businessDataResponse.json();

    // Process the query and generate response
    const response = await processChatbotQuery(query, businessData, userId);
    
    res.json({
      query,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing query', error: error.message });
  }
});

// AI Query Processing Function
async function processChatbotQuery(query, businessData, userId) {
  const lowerQuery = query.toLowerCase();
  
  // Sales and Revenue Questions
  if (lowerQuery.includes('sales') || lowerQuery.includes('revenue') || lowerQuery.includes('income')) {
    const totalSales = businessData.summary.totalSales;
    const recentSales = businessData.recentActivity.recentInvoices.slice(0, 5);
    
    if (lowerQuery.includes('total') || lowerQuery.includes('how much')) {
      return `Your total sales amount is ₹${totalSales.toLocaleString('en-IN')}. This includes all invoices generated so far.`;
    }
    
    if (lowerQuery.includes('recent') || lowerQuery.includes('latest')) {
      const salesList = recentSales.map(inv => 
        `• ${inv.invoiceNumber}: ₹${inv.totalAmount.toLocaleString('en-IN')} (${inv.status})`
      ).join('\n');
      return `Here are your recent sales:\n${salesList}`;
    }
    
    return `Your total sales: ₹${totalSales.toLocaleString('en-IN')}\nRecent sales: ${recentSales.length} invoices in the last period.`;
  }

  // Customer Questions
  if (lowerQuery.includes('customer') || lowerQuery.includes('client')) {
    const totalCustomers = businessData.summary.totalCustomers;
    const topCustomers = businessData.analytics.topCustomers;
    
    if (lowerQuery.includes('how many') || lowerQuery.includes('total')) {
      return `You have ${totalCustomers} customers in your database.`;
    }
    
    if (lowerQuery.includes('top') || lowerQuery.includes('best')) {
      const topList = topCustomers.slice(0, 5).map(([name, amount]) => 
        `• ${name}: ₹${amount.toLocaleString('en-IN')}`
      ).join('\n');
      return `Your top customers by sales:\n${topList}`;
    }
    
    return `You have ${totalCustomers} customers. Your top customer is ${topCustomers[0]?.[0] || 'N/A'} with ₹${topCustomers[0]?.[1]?.toLocaleString('en-IN') || '0'} in sales.`;
  }

  // Inventory Questions
  if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('product')) {
    const totalProducts = businessData.summary.totalProducts;
    const lowStock = businessData.analytics.lowStockItems;
    const outOfStock = businessData.analytics.outOfStockItems;
    
    if (lowerQuery.includes('low') || lowerQuery.includes('running out')) {
      return `You have ${lowStock} items with low stock (≤5 units) and ${outOfStock} items out of stock. Consider restocking these items.`;
    }
    
    if (lowerQuery.includes('how many') || lowerQuery.includes('total')) {
      return `You have ${totalProducts} products in your inventory.`;
    }
    
    return `Inventory Status:\n• Total Products: ${totalProducts}\n• Low Stock Items: ${lowStock}\n• Out of Stock: ${outOfStock}`;
  }

  // Financial Summary
  if (lowerQuery.includes('profit') || lowerQuery.includes('financial') || lowerQuery.includes('summary')) {
    const { totalSales, totalPurchases, totalExpenses, totalRevenue } = businessData.summary;
    
    return `Financial Summary:\n• Total Sales: ₹${totalSales.toLocaleString('en-IN')}\n• Total Purchases: ₹${totalPurchases.toLocaleString('en-IN')}\n• Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}\n• Net Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`;
  }

  // Invoice Questions
  if (lowerQuery.includes('invoice') || lowerQuery.includes('bill')) {
    const totalInvoices = businessData.summary.totalInvoices;
    const recentInvoices = businessData.recentActivity.recentInvoices;
    
    if (lowerQuery.includes('pending') || lowerQuery.includes('unpaid')) {
      const pendingInvoices = recentInvoices.filter(inv => inv.status === 'pending');
      return `You have ${pendingInvoices.length} pending invoices. Consider following up with customers for payment.`;
    }
    
    if (lowerQuery.includes('how many') || lowerQuery.includes('total')) {
      return `You have generated ${totalInvoices} invoices so far.`;
    }
    
    return `Invoice Summary:\n• Total Invoices: ${totalInvoices}\n• Recent Activity: ${recentInvoices.length} invoices in the last period`;
  }

  // Payment Questions
  if (lowerQuery.includes('payment') || lowerQuery.includes('paid') || lowerQuery.includes('money')) {
    const recentPayments = businessData.recentActivity.recentPayments;
    const totalRevenue = businessData.summary.totalRevenue;
    
    if (lowerQuery.includes('recent') || lowerQuery.includes('latest')) {
      const paymentList = recentPayments.slice(0, 5).map(payment => 
        `• ₹${payment.amount.toLocaleString('en-IN')} via ${payment.paymentMethod} (${payment.status})`
      ).join('\n');
      return `Recent payments:\n${paymentList}`;
    }
    
    return `Payment Summary:\n• Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}\n• Recent Payments: ${recentPayments.length} transactions`;
  }

  // Company Information
  if (lowerQuery.includes('company') || lowerQuery.includes('business') || lowerQuery.includes('profile')) {
    const company = businessData.company;
    if (company) {
      return `Company Information:\n• Business Name: ${company.businessName || 'Not set'}\n• Company Name: ${company.companyName || 'Not set'}\n• Email: ${company.email || 'Not set'}\n• Phone: ${company.phone || 'Not set'}`;
    }
    return 'Company profile information is not available. Please update your company profile in Settings.';
  }

  // General Help
  if (lowerQuery.includes('help') || lowerQuery.includes('what can') || lowerQuery.includes('how to')) {
    return `I can help you with:\n• Sales and revenue information\n• Customer data and analytics\n• Inventory and stock levels\n• Invoice and payment status\n• Financial summaries\n• Company profile information\n\nJust ask me questions like:\n• "What's my total sales?"\n• "How many customers do I have?"\n• "Show me low stock items"\n• "What's my profit this month?"`;
  }

  // Default response for unrecognized queries
  return `I understand you're asking about "${query}". I can help you with sales, customers, inventory, invoices, payments, and financial data. Try asking something like:\n• "What's my total sales?"\n• "How many customers do I have?"\n• "Show me my recent invoices"\n• "What's my inventory status?"`;
}

// Firebase Authentication Integration
// Create or get user from Firebase UID
app.post('/api/auth/firebase', async (req, res) => {
  try {
    const { firebaseUid, email, name, photoURL } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ message: 'Firebase UID and email are required' });
    }

    // Check if user already exists with this Firebase UID
    let user = await User.findOne({ firebaseUid });
    
    if (!user) {
      // Check if user exists with this email
      user = await User.findOne({ email });
      
      if (user) {
        // Update existing user with Firebase UID
        user.firebaseUid = firebaseUid;
        user.name = name || user.name;
        user.photoURL = photoURL || user.photoURL;
        await user.save();
      } else {
        // Create new user
        user = new User({
          firebaseUid,
          email,
          name: name || email.split('@')[0],
          photoURL,
          password: '', // No password needed for Firebase auth
          isFirebaseUser: true
        });
        await user.save();
      }
    }

    // Generate JWT token for backend authentication
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        firebaseUid: user.firebaseUid 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Firebase authentication successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        firebaseUid: user.firebaseUid
      }
    });
  } catch (error) {
    console.error('Firebase auth error:', error);
    res.status(500).json({ message: 'Error processing Firebase authentication', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

