const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemType: {
    type: String,
    required: true,
    enum: ['product', 'service', 'consultation', 'other'],
    default: 'product'
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  isTaxIncluded: {
    type: Boolean,
    default: false
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  taxPercent: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  primaryUnit: {
    type: String,
    required: true,
    default: 'piece'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search functionality
itemSchema.index({ userId: 1, itemName: 'text', description: 'text' });

module.exports = mongoose.model('Item', itemSchema);


