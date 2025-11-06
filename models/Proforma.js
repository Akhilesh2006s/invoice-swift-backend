const mongoose = require('mongoose');

const proformaSchema = new mongoose.Schema({
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
  proformaNumber: {
    type: String,
    required: true,
    unique: true
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
  proformaDate: {
    type: Date,
    default: Date.now
  },
  validUntil: {
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
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
    default: 'draft'
  },
  terms: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  convertedToInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  convertedDate: {
    type: Date
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String
  }]
}, {
  timestamps: true
});

// Generate proforma number before saving
proformaSchema.pre('save', async function(next) {
  try {
    console.log('Pre-save hook triggered for Proforma:', {
      isNew: this.isNew,
      proformaNumber: this.proformaNumber,
      userId: this.userId
    });
    
    if (this.isNew && !this.proformaNumber) {
      const count = await this.constructor.countDocuments({ userId: this.userId });
      this.proformaNumber = `PF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log('Generated proforma number:', this.proformaNumber);
    }
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('Proforma', proformaSchema);
