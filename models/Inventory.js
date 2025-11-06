const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  movementType: {
    type: String,
    enum: ['stock_in', 'stock_out', 'adjustment'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  referenceType: {
    type: String,
    enum: ['purchase', 'sale', 'manual', 'adjustment'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Optional for manual adjustments
  },
  reason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const inventorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  currentStock: {
    type: Number,
    default: 0,
    min: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  availableStock: {
    type: Number,
    default: 0,
    min: 0
  },
  minimumStock: {
    type: Number,
    default: 0,
    min: 0
  },
  maximumStock: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    default: 'pcs'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  movements: [inventoryMovementSchema]
}, {
  timestamps: true
});

// Pre-save hook to calculate available stock
inventorySchema.pre('save', function(next) {
  this.availableStock = this.currentStock - this.reservedStock;
  this.lastUpdated = new Date();
  next();
});

// Index for efficient queries
inventorySchema.index({ userId: 1, itemId: 1 }, { unique: true });
inventorySchema.index({ userId: 1, currentStock: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
