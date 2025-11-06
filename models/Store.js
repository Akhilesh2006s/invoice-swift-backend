const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
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
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  storeSlug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  storeDescription: {
    type: String,
    trim: true
  },
  storeLogo: {
    type: String, // Base64 or URL
    default: ''
  },
  storeBanner: {
    type: String, // Base64 or URL
    default: ''
  },
  domain: {
    customDomain: {
      type: String,
      trim: true
    },
    swipeDomain: {
      type: String,
      default: ''
    },
    isCustom: {
      type: Boolean,
      default: false
    }
  },
  settings: {
    layout: {
      productLayout: {
        type: String,
        enum: ['grid', 'list', 'masonry'],
        default: 'grid'
      },
      productsPerPage: {
        type: Number,
        default: 12
      },
      showProductImages: {
        type: Boolean,
        default: true
      },
      showProductPrices: {
        type: Boolean,
        default: true
      },
      showProductDescriptions: {
        type: Boolean,
        default: true
      }
    },
    payment: {
      cashOnDelivery: {
        type: Boolean,
        default: true
      },
      onlinePayment: {
        type: Boolean,
        default: true
      },
      paymentAfterOrder: {
        type: Boolean,
        default: false
      },
      allowedPaymentMethods: [{
        type: String,
        enum: ['card', 'upi', 'netbanking', 'cod', 'wallet']
      }]
    },
    checkout: {
      requireRegistration: {
        type: Boolean,
        default: false
      },
      guestCheckout: {
        type: Boolean,
        default: true
      },
      collectShippingAddress: {
        type: Boolean,
        default: true
      },
      collectBillingAddress: {
        type: Boolean,
        default: false
      }
    },
    notifications: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: false
      },
      orderConfirmation: {
        type: Boolean,
        default: true
      },
      orderUpdates: {
        type: Boolean,
        default: true
      }
    },
    seo: {
      metaTitle: {
        type: String,
        trim: true
      },
      metaDescription: {
        type: String,
        trim: true
      },
      metaKeywords: [{
        type: String,
        trim: true
      }]
    }
  },
  appearance: {
    primaryColor: {
      type: String,
      default: '#3B82F6'
    },
    secondaryColor: {
      type: String,
      default: '#6B7280'
    },
    backgroundColor: {
      type: String,
      default: '#FFFFFF'
    },
    textColor: {
      type: String,
      default: '#1F2937'
    },
    fontFamily: {
      type: String,
      default: 'Inter'
    },
    customCSS: {
      type: String,
      default: ''
    }
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  analytics: {
    totalViews: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    lastViewed: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
storeSchema.index({ userId: 1 });
storeSchema.index({ 'domain.customDomain': 1 });
storeSchema.index({ isPublished: 1, isActive: 1 });

// Pre-save hook to generate store slug
storeSchema.pre('save', function(next) {
  if (this.isNew && !this.storeSlug) {
    this.storeSlug = this.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Store', storeSchema);
