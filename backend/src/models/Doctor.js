/**
 * Doctor model.
 *
 * Index strategy (the collection is the search/filter/pagination hot path):
 *  - name "text" + specialization/hospital in the compound text index -> single-query search
 *  - { specialization: 1, createdAt: 1 } -> filter + sort without a blocking SORT stage
 *  - { createdAt: -1 } _id desc -> default pagination order
 *  - unique email -> integrity guard, and exact lookups
 */
const mongoose = require('mongoose');

const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,19}$/;

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      maxlength: 120,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      maxlength: 120,
    },
    hospital: {
      type: String,
      required: [true, 'Hospital is required'],
      trim: true,
      maxlength: 160,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      match: [PHONE_REGEX, 'Invalid phone number'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

// Text index: one query covers name/specialization/hospital search terms.
doctorSchema.index({ name: 'text', specialization: 'text', hospital: 'text' });

// Compound indexes covering the common filter+sort+paginate combinations.
doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ hospital: 1, createdAt: -1 });
doctorSchema.index({ status: 1, createdAt: -1 });
doctorSchema.index({ createdAt: -1 }); // default listing order

doctorSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Doctor', doctorSchema);
