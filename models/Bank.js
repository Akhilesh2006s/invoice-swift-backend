const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  confirmAccountNumber: {
    type: String,
    required: true,
    trim: true
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  branchName: {
    type: String,
    required: true,
    trim: true
  },
  upi: {
    type: String,
    trim: true
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  upiNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure account numbers match
bankSchema.pre('save', function(next) {
  if (this.accountNumber !== this.confirmAccountNumber) {
    const error = new Error('Account numbers do not match');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Bank', bankSchema);


