const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  isVerified: { type: Boolean, required: false, default: false }, // New field for verification status
  verificationToken: { type: String, required: false }, // Token for email verification
  verificationTokenExpiry: { type: Date, required: false }, // Expiry time for the token
});

module.exports = mongoose.model("User", userSchema);
