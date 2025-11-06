const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  expenseNumber: {
    type: String,
    unique: true,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  expenseDate: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    enum: [
      'Bank Fee and Charges',
      'Electricity Bill',
      'Employee Salaries',
      'Printing',
      'Raw Material',
      'Rent Expense',
      'Repair and Maintenance',
      'Telephone and Internet Bills',
      'Others'
    ],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  paymentType: {
    type: String,
    enum: ['UPI', 'Cash', 'Card', 'Net Banking', 'Cheque'],
    required: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidDate: {
    type: Date
  },
  attachments: [{
    fileName: String,
    fileType: String,
    fileSize: Number,
    fileData: String, // Base64 encoded file data
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Pre-save hook to generate expenseNumber
expenseSchema.pre('save', async function(next) {
  try {
    console.log('Pre-save hook triggered for Expense:', {
      isNew: this.isNew,
      expenseNumber: this.expenseNumber,
      userId: this.userId
    });
    
    if (this.isNew && !this.expenseNumber) {
      const count = await this.constructor.countDocuments({ userId: this.userId });
      this.expenseNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Generated expense number:', this.expenseNumber);
    }
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('Expense', expenseSchema);
