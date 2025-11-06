const mongoose = require('mongoose');

const debitNoteSchema = new mongoose.Schema({
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
  debitNoteNumber: {
    type: String,
    required: true,
    unique: true
  },
  originalPurchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: true
  },
  originalPurchaseNumber: {
    type: String,
    required: true
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
  debitNoteDate: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'Return of Goods',
      'Defective Product',
      'Wrong Product',
      'Overcharged',
      'Cancellation',
      'Discount Adjustment',
      'Other'
    ]
  },
  description: {
    type: String,
    trim: true
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
  status: {
    type: String,
    enum: ['draft', 'issued', 'applied', 'cancelled'],
    default: 'draft'
  },
  appliedToPurchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase'
  },
  appliedDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate debit note number before saving
debitNoteSchema.pre('save', async function(next) {
  try {
    console.log('Pre-save hook triggered for DebitNote:', {
      isNew: this.isNew,
      debitNoteNumber: this.debitNoteNumber,
      userId: this.userId
    });
    
    if (this.isNew && !this.debitNoteNumber) {
      const count = await this.constructor.countDocuments({ userId: this.userId });
      this.debitNoteNumber = `DN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Generated debit note number:', this.debitNoteNumber);
    }
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('DebitNote', debitNoteSchema);
