const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  companyLogo: {
    type: String, // URL or file path
    trim: true
  },
  companyCountry: {
    type: String,
    required: true,
    trim: true
  },
  organisationName: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  companyPhone: {
    type: String,
    required: true,
    trim: true
  },
  companyEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  gstIn: {
    type: String,
    trim: true
  },
  companyAddress: {
    type: String,
    required: true,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Remove unique constraint to allow multiple companies per user
// companySchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Company', companySchema);
