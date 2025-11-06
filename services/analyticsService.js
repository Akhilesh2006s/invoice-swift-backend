const Analytics = require('../models/Analytics');
const { EventEmitter } = require('events');

// In-memory event bus for analytics updates
const analyticsEvents = new EventEmitter();
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Purchase = require('../models/Purchase');
const Customer = require('../models/Customer');
const Item = require('../models/Item');

class AnalyticsService {
  
  // Calculate and update analytics for a user
  static async updateAnalytics(userId, period = '30days') {
    try {
      console.log(`Updating analytics for user ${userId}, period: ${period}`);
      
      // Get date range based on period
      const dateRange = this.getDateRange(period);
      
      // Find existing analytics record or create new one
      let analytics = await Analytics.findOne({ 
        userId, 
        'dateRange.period': period 
      });
      
      // If analytics exists, reset it to ensure we start fresh with real data
      if (analytics) {
        // Reset all fields to empty/zero
        analytics.totalSales = 0;
        analytics.totalPurchases = 0;
        analytics.totalExpenses = 0;
        analytics.netProfit = 0;
        analytics.paymentMethods = [];
        analytics.salesByDate = [];
        analytics.topProducts = [];
        analytics.topCustomers = [];
        analytics.paymentFlow = {
          moneyIn: { total: 0, count: 0 },
          moneyOut: { total: 0, count: 0 }
        };
        analytics.dailyPayments = [];
        analytics.kpis = {
          totalCustomers: 0,
          totalProducts: 0,
          totalInvoices: 0,
          avgOrderValue: 0,
          conversionRate: 0
        };
      } else {
        // Create new analytics record
        analytics = new Analytics({
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
      }
      
      // Update date range
      analytics.dateRange.startDate = dateRange.startDate;
      analytics.dateRange.endDate = dateRange.endDate;
      analytics.dateRange.period = period;
      
      // Calculate all metrics from real data
      await Promise.all([
        this.calculateFinancialOverview(userId, analytics, dateRange),
        this.calculatePaymentMethods(userId, analytics, dateRange),
        this.calculateSalesTrends(userId, analytics, dateRange),
        this.calculateTopProducts(userId, analytics, dateRange),
        this.calculateTopCustomers(userId, analytics, dateRange),
        this.calculatePaymentFlow(userId, analytics, dateRange),
        this.calculateDailyPayments(userId, analytics, dateRange),
        this.calculateKPIs(userId, analytics, dateRange)
      ]);
      
      // Calculate derived metrics
      analytics.calculateNetProfit();
      analytics.calculatePaymentPercentages();
      
      // Update timestamp
      analytics.lastUpdated = new Date();
      
      // Save analytics
      await analytics.save();
      
      console.log('Analytics updated successfully with real data');
      // Notify listeners that analytics have been updated
      try {
        analyticsEvents.emit('analytics:update', {
          userId: userId?.toString?.() || userId,
          period,
          lastUpdated: analytics.lastUpdated,
        });
      } catch (emitErr) {
        console.error('Error emitting analytics:update event:', emitErr);
      }
      return analytics;
      
    } catch (error) {
      console.error('Error updating analytics:', error);
      throw error;
    }
  }
  
  // Clear all analytics for a user (useful for removing cached/fake data)
  static async clearAnalytics(userId) {
    try {
      const result = await Analytics.deleteMany({ userId });
      console.log(`Cleared ${result.deletedCount} analytics records for user ${userId}`);
      return result;
    } catch (error) {
      console.error('Error clearing analytics:', error);
      throw error;
    }
  }
  
  // Get date range based on period
  static getDateRange(period) {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return { startDate, endDate };
  }
  
  // Calculate financial overview
  static async calculateFinancialOverview(userId, analytics, dateRange) {
    try {
      const { startDate, endDate } = dateRange;
      
      // Convert userId to ObjectId if it's a string
      const userObjectId = typeof userId === 'string' ? new require('mongoose').Types.ObjectId(userId) : userId;
      
      // Total Sales
      const salesResult = await Invoice.aggregate([
        { 
          $match: { 
            userId: userObjectId, 
            createdAt: { $gte: startDate, $lte: endDate }
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      
      // Total Purchases
      const purchasesResult = await Purchase.aggregate([
        { 
          $match: { 
            userId: userObjectId, 
            createdAt: { $gte: startDate, $lte: endDate }
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      
      // Total Expenses
      const expensesResult = await Expense.aggregate([
        { 
          $match: { 
            userId: userObjectId, 
            createdAt: { $gte: startDate, $lte: endDate }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      analytics.totalSales = salesResult[0]?.total || 0;
      analytics.totalPurchases = purchasesResult[0]?.total || 0;
      analytics.totalExpenses = expensesResult[0]?.total || 0;
    } catch (error) {
      console.error('Error calculating financial overview:', error);
      analytics.totalSales = 0;
      analytics.totalPurchases = 0;
      analytics.totalExpenses = 0;
    }
  }
  
  // Calculate payment methods distribution
  static async calculatePaymentMethods(userId, analytics, dateRange) {
    try {
      const { startDate, endDate } = dateRange;
      const userObjectId = typeof userId === 'string' ? new require('mongoose').Types.ObjectId(userId) : userId;
      
      const paymentMethods = await Payment.aggregate([
        { 
          $match: { 
            userId: userObjectId, 
            paymentDate: { $gte: startDate, $lte: endDate }
          } 
        },
        { 
          $group: { 
            _id: '$paymentMethod', 
            total: { $sum: '$amount' }, 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { total: -1 } }
      ]);
      
      analytics.paymentMethods = paymentMethods.map(method => ({
        method: method._id || 'Unknown',
        total: method.total || 0,
        count: method.count || 0,
        percentage: 0 // Will be calculated later
      }));
    } catch (error) {
      console.error('Error calculating payment methods:', error);
      analytics.paymentMethods = [];
    }
  }
  
  // Calculate sales trends
  static async calculateSalesTrends(userId, analytics, dateRange) {
    const { startDate, endDate } = dateRange;
    
    const salesByDate = await Invoice.aggregate([
      { 
        $match: { 
          userId: userId, 
          createdAt: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    analytics.salesByDate = salesByDate.map(day => ({
      date: day._id,
      sales: day.sales,
      orders: day.orders
    }));
  }
  
  // Calculate top products
  static async calculateTopProducts(userId, analytics, dateRange) {
    const { startDate, endDate } = dateRange;
    
    const topProducts = await Invoice.aggregate([
      { 
        $match: { 
          userId: userId, 
          createdAt: { $gte: startDate, $lte: endDate }
        } 
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.description',
          totalQuantity: { $sum: '$items.quantity' },
          totalAmount: { $sum: '$items.total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);
    
    analytics.topProducts = topProducts.map((product, index) => ({
      productName: product._id,
      totalQuantity: product.totalQuantity,
      totalAmount: product.totalAmount,
      orderCount: product.orderCount,
      rank: index + 1
    }));
  }
  
  // Calculate top customers
  static async calculateTopCustomers(userId, analytics, dateRange) {
    const { startDate, endDate } = dateRange;
    
    const topCustomers = await Invoice.aggregate([
      { 
        $match: { 
          userId: userId, 
          createdAt: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: '$customerName',
          totalAmount: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);
    
    analytics.topCustomers = topCustomers.map((customer, index) => ({
      customerName: customer._id,
      totalAmount: customer.totalAmount,
      invoiceCount: customer.invoiceCount,
      avgOrderValue: customer.avgOrderValue,
      rank: index + 1
    }));
  }
  
  // Calculate payment flow
  static async calculatePaymentFlow(userId, analytics, dateRange) {
    const { startDate, endDate } = dateRange;
    
    const paymentFlow = await Payment.aggregate([
      { 
        $match: { 
          userId: userId, 
          paymentDate: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const moneyIn = paymentFlow.find(p => p._id === 'Received') || { total: 0, count: 0 };
    const moneyOut = paymentFlow.find(p => p._id === 'Paid') || { total: 0, count: 0 };
    
    analytics.paymentFlow = {
      moneyIn: {
        total: moneyIn.total,
        count: moneyIn.count
      },
      moneyOut: {
        total: moneyOut.total,
        count: moneyOut.count
      }
    };
  }
  
  // Calculate daily payments
  static async calculateDailyPayments(userId, analytics, dateRange) {
    const { startDate, endDate } = dateRange;
    
    const dailyPayments = await Payment.aggregate([
      { 
        $match: { 
          userId: userId, 
          paymentDate: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' }
          },
          received: {
            $sum: { $cond: [{ $eq: ['$paymentType', 'Received'] }, '$amount', 0] }
          },
          paid: {
            $sum: { $cond: [{ $eq: ['$paymentType', 'Paid'] }, '$amount', 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    analytics.dailyPayments = dailyPayments.map(day => ({
      date: day._id,
      received: day.received,
      paid: day.paid
    }));
  }
  
  // Calculate KPIs
  static async calculateKPIs(userId, analytics, dateRange) {
    const { startDate, endDate } = dateRange;
    
    // Total customers
    const totalCustomers = await Customer.countDocuments({ userId });
    
    // Total products
    const totalProducts = await Item.countDocuments({ userId });
    
    // Total invoices in period
    const totalInvoices = await Invoice.countDocuments({ 
      userId, 
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Average order value
    const avgOrderResult = await Invoice.aggregate([
      { 
        $match: { 
          userId: userId, 
          createdAt: { $gte: startDate, $lte: endDate }
        } 
      },
      { $group: { _id: null, avgOrder: { $avg: '$totalAmount' } } }
    ]);
    
    analytics.kpis = {
      totalCustomers,
      totalProducts,
      totalInvoices,
      avgOrderValue: avgOrderResult[0]?.avgOrder || 0,
      conversionRate: 0 // Can be calculated based on business logic
    };
  }
  
  // Get analytics for user
  static async getAnalytics(userId, period = '30days') {
    try {
      // Get existing analytics
      let analytics = await Analytics.findOne({ 
        userId, 
        'dateRange.period': period 
      }).sort({ lastUpdated: -1 });
      
      // Always force recalculation to ensure we have real data (not cached fake data)
      // This will reset and recalculate from actual database records
      analytics = await this.updateAnalytics(userId, period);
      
      // If still no analytics after update, create empty analytics record
      if (!analytics) {
        analytics = await this.createEmptyAnalytics(userId, period);
      }
      
      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      // Return empty analytics if there's an error
      return await this.createEmptyAnalytics(userId, period);
    }
  }
  
  // Create empty analytics record
  static async createEmptyAnalytics(userId, period) {
    try {
      const analytics = new Analytics({
        userId,
        dateRange: { period },
        totalSales: 0,
        totalPurchases: 0,
        totalExpenses: 0,
        netProfit: 0,
        paymentMethods: [],
        salesByDate: [],
        topProducts: [],
        topCustomers: [],
        paymentFlow: {
          moneyIn: { total: 0, count: 0 },
          moneyOut: { total: 0, count: 0 }
        },
        dailyPayments: [],
        kpis: {
          totalCustomers: 0,
          totalProducts: 0,
          totalInvoices: 0,
          avgOrderValue: 0,
          conversionRate: 0
        }
      });
      await analytics.save();
      return analytics;
    } catch (error) {
      console.error('Error creating empty analytics:', error);
      throw error;
    }
  }
  
  // Trigger analytics update when data changes
  static async triggerUpdate(userId) {
    try {
      // Update analytics for different periods
      await Promise.all([
        this.updateAnalytics(userId, '7days'),
        this.updateAnalytics(userId, '30days'),
        this.updateAnalytics(userId, '90days')
      ]);
      // Emit a generic update event without specific period (listeners may refetch)
      try {
        analyticsEvents.emit('analytics:bulkUpdate', {
          userId: userId?.toString?.() || userId,
          periods: ['7days', '30days', '90days'],
          lastUpdated: new Date(),
        });
      } catch (emitErr) {
        console.error('Error emitting analytics:bulkUpdate event:', emitErr);
      }
    } catch (error) {
      console.error('Error triggering analytics update:', error);
    }
  }
}

module.exports = AnalyticsService;
module.exports.analyticsEvents = analyticsEvents;
