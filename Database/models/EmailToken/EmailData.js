const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema({
  ticketId: String,
  senderName: String,
  senderEmail: String,
  queryDetails: String,
  priority: String,
  assignedTo: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
});

const Email = mongoose.model("Email", emailSchema);
