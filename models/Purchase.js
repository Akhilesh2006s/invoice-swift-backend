const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
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
  purchaseNumber: {
    type: String,
    required: true,
    unique: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  vendorName: {
    type: String,
    required: true,
    trim: true
  },
  vendorEmail: {
    type: String,
    trim: true
  },
  vendorPhone: {
    type: String,
    trim: true
  },
  vendorAddress: {
    type: String,
    trim: true
  },
  vendorGSTIN: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [{
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    taxPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit Card', 'Other'],
    default: 'Cash'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'cancelled', 'overdue'],
    default: 'draft'
  },
  paidDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String
  }]
}, {
  timestamps: true
});

// Generate purchase number before saving
purchaseSchema.pre('save', async function(next) {
  try {
    console.log('Pre-save hook triggered for Purchase:', {
      isNew: this.isNew,
      purchaseNumber: this.purchaseNumber,
      userId: this.userId
    });
    
    if (this.isNew && !this.purchaseNumber) {
      const count = await this.constructor.countDocuments({ userId: this.userId });
      this.purchaseNumber = `PUR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Generated purchase number:', this.purchaseNumber);
    }
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('Purchase', purchaseSchema);
