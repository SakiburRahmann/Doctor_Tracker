/**
 * Admin user model.
 * Credential-based authentication for the admin portal (no public sign-up by design).
 * Passwords are hashed with bcrypt (10 salt rounds) and never leave the server.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin'], default: 'admin' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

adminSchema.methods.matchPassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

adminSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

adminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash; // never leak the hash through serialization
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Admin', adminSchema);
