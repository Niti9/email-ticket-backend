import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmailToken",
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    default: null
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: null
  },
  ticketId: { type: String, required: true, unique: true },
  senderName: { type: String, required: true },
  senderEmail: { type: String, required: true },
  queryDetails: { type: String, required: true },
  priority: { type: String, default: "Medium" }, // Default priority
  // assignedTo: { type: String, default: "Unassigned" },
  status: { type: String, default: "Open" },
  bodyPreview: { type: String },
  body: {
    content: { type: String, required: true } // Only save the content
  },
  conversationId: { type: String, required: true }, // Identify conversations
  comments: [
    {
      commentId: { type: String, required: true, unique: true }, // Unique ID for each comment
      senderName: { type: String, required: true },
      senderEmail: { type: String, required: true },
      content: { type: String, required: true },
      // role: { type: String, enum: ["admin", "user"], required: true },
      role: { type: String, enum: ["admin", "user"] },
      sentAt: { type: Date, default: Date.now }
    }
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const TicketModel = mongoose.model("Ticket", ticketSchema);
export default TicketModel;
