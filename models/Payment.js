const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  paymentNumber: {
    type: String,
    unique: true,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit Card', 'Other'],
    required: true
  },
  paymentType: {
    type: String,
    enum: ['Received', 'Paid'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  referenceType: {
    type: String,
    enum: ['invoice', 'purchase', 'manual', 'refund'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Optional for manual payments
  },
  referenceNumber: {
    type: String,
    required: false
  },
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    upiId: String
  },
  attachments: [{
    fileName: String,
    fileType: String,
    fileSize: Number,
    fileData: String, // Base64 encoded
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // For received payments (sales)
  invoicePayments: [{
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    invoiceNumber: String,
    amount: Number
  }],
  // For paid payments (purchases)
  purchasePayments: [{
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase'
    },
    purchaseNumber: String,
    amount: Number
  }],
  balance: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save hook to generate paymentNumber
paymentSchema.pre('save', async function(next) {
  try {
    console.log('Pre-save hook triggered for Payment:', {
      isNew: this.isNew,
      paymentNumber: this.paymentNumber,
      paymentType: this.paymentType,
      userId: this.userId
    });
    
    if (this.isNew && !this.paymentNumber) {
      const prefix = this.paymentType === 'Received' ? 'REC' : 'PAY';
      const count = await this.constructor.countDocuments({ 
        userId: this.userId, 
        paymentType: this.paymentType 
      });
      this.paymentNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Generated payment number:', this.paymentNumber);
    }
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

// Index for efficient queries
paymentSchema.index({ userId: 1, customerId: 1 });
paymentSchema.index({ userId: 1, paymentDate: -1 });
paymentSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
