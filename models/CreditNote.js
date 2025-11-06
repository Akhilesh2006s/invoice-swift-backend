const mongoose = require('mongoose');

const creditNoteSchema = new mongoose.Schema({
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
  creditNoteNumber: {
    type: String,
    required: true,
    unique: true
  },
  originalInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  originalInvoiceNumber: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true
  },
  creditNoteDate: {
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
  appliedToInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
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

// Generate credit note number before saving
creditNoteSchema.pre('save', async function(next) {
  try {
    console.log('Pre-save hook triggered for CreditNote:', {
      isNew: this.isNew,
      creditNoteNumber: this.creditNoteNumber,
      userId: this.userId
    });
    
    if (this.isNew && !this.creditNoteNumber) {
      const count = await this.constructor.countDocuments({ userId: this.userId });
      this.creditNoteNumber = `CN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Generated credit note number:', this.creditNoteNumber);
    }
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('CreditNote', creditNoteSchema);
