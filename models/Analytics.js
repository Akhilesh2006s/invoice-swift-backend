const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Financial Overview
  totalSales: {
    type: Number,
    default: 0
  },
  totalPurchases: {
    type: Number,
    default: 0
  },
  totalExpenses: {
    type: Number,
    default: 0
  },
  netProfit: {
    type: Number,
    default: 0
  },
  
  // Payment Methods Distribution
  paymentMethods: [{
    method: {
      type: String,
      required: true
    },
    total: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    }
  }],
  
  // Sales Trends (Last 30 days)
  salesByDate: [{
    date: {
      type: String,
      required: true
    },
    sales: {
      type: Number,
      default: 0
    },
    orders: {
      type: Number,
      default: 0
    }
  }],
  
  // Top Selling Products
  topProducts: [{
    productName: {
      type: String,
      required: true
    },
    totalQuantity: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    orderCount: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      required: true
    }
  }],
  
  // Top Customers
  topCustomers: [{
    customerName: {
      type: String,
      required: true
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    invoiceCount: {
      type: Number,
      default: 0
    },
    avgOrderValue: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      required: true
    }
  }],
  
  // Payment Flow (Money In vs Money Out)
  paymentFlow: {
    moneyIn: {
      total: {
        type: Number,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      }
    },
    moneyOut: {
      total: {
        type: Number,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Daily Payment Trends (Last 30 days)
  dailyPayments: [{
    date: {
      type: String,
      required: true
    },
    received: {
      type: Number,
      default: 0
    },
    paid: {
      type: Number,
      default: 0
    }
  }],
  
  // Key Performance Indicators
  kpis: {
    totalCustomers: {
      type: Number,
      default: 0
    },
    totalProducts: {
      type: Number,
      default: 0
    },
    totalInvoices: {
      type: Number,
      default: 0
    },
    avgOrderValue: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    }
  },
  
  // Last Updated
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Date Range for this analytics data
  dateRange: {
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    period: {
      type: String,
      enum: ['7days', '30days', '90days', '1year', 'custom'],
      default: '30days'
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
analyticsSchema.index({ userId: 1, 'dateRange.period': 1 });
analyticsSchema.index({ userId: 1, lastUpdated: -1 });

// Method to calculate net profit
analyticsSchema.methods.calculateNetProfit = function() {
  this.netProfit = this.totalSales - this.totalPurchases - this.totalExpenses;
  return this.netProfit;
};

// Method to calculate payment method percentages
analyticsSchema.methods.calculatePaymentPercentages = function() {
  const totalPayments = this.paymentMethods.reduce((sum, method) => sum + method.total, 0);
  
  this.paymentMethods.forEach(method => {
    method.percentage = totalPayments > 0 ? (method.total / totalPayments) * 100 : 0;
  });
  
  return this.paymentMethods;
};

// Static method to find or create analytics for user
analyticsSchema.statics.findOrCreateForUser = async function(userId, period = '30days') {
  try {
    let analytics = await this.findOne({ 
      userId, 
      'dateRange.period': period 
    }).sort({ lastUpdated: -1 });
    
    if (!analytics) {
      analytics = new this({
        userId,
        dateRange: { period },
        paymentMethods: [],
        salesByDate: [],
        topProducts: [],
        topCustomers: [],
        dailyPayments: [],
        paymentFlow: {
          moneyIn: { total: 0, count: 0 },
          moneyOut: { total: 0, count: 0 }
        },
        kpis: {
          totalCustomers: 0,
          totalProducts: 0,
          totalInvoices: 0,
          avgOrderValue: 0,
          conversionRate: 0
        }
      });
      await analytics.save();
    }
    
    return analytics;
  } catch (error) {
    console.error('Error in findOrCreateForUser:', error);
    throw error;
  }
};

module.exports = mongoose.model('Analytics', analyticsSchema);
