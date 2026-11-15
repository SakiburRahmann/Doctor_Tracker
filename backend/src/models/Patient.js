/**
 * Patient model.
 * A patient belongs to exactly one doctor (classic 1:N referenced relationship).
 *
 * Index strategy mirrors the Doctor model because this collection carries the same
 * search / filter / paginate load:
 *  - text index on name + condition + notes
 *  - { doctor: 1, createdAt: -1 } -> "patients of doctor X, newest first" (used by the doctor detail view)
 *  - { condition: 1, createdAt: -1 } and { status: 1, createdAt: -1 } -> filter+sort covered
 */
const mongoose = require('mongoose');

const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,19}$/;

const CONDITIONS = [
  'Critical',
  'Serious',
  'Stable',
  'Recovering',
  'Chronic',
  'Under Observation',
];

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      maxlength: 120,
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
      max: [130, 'Age looks invalid'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    condition: {
      type: String,
      enum: CONDITIONS,
      required: [true, 'Condition is required'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Patient must belong to a doctor'],
      index: true,
    },
    phone: {
      type: String,
      match: [PHONE_REGEX, 'Invalid phone number'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    status: {
      type: String,
      enum: ['admitted', 'discharged', 'follow-up'],
      default: 'admitted',
    },
    admittedAt: { type: Date, default: Date.now },
    notes: { type: String, maxlength: 500, trim: true },
  },
  { timestamps: true }
);

patientSchema.index({ name: 'text', condition: 'text', notes: 'text' });
patientSchema.index({ doctor: 1, createdAt: -1 });
patientSchema.index({ doctor: 1, condition: 1 }); // doctor detail mix: match by doctor, group by condition
patientSchema.index({ condition: 1, createdAt: -1 });
patientSchema.index({ status: 1, createdAt: -1 });
patientSchema.index({ createdAt: -1 });

patientSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Patient', patientSchema);
