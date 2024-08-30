const mongoose = require("mongoose");

const emailCredentialsSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
});

const EmailCredentials = mongoose.model(
  "EmailCredential",
  emailCredentialsSchema
);

module.exports = EmailCredentials;
