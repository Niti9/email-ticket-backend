import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  senderName: { type: String, required: true },
  senderEmail: { type: String, required: true },
  queryDetails: { type: String, required: true },
  priority: { type: String, default: "Medium" }, // Default priority
  assignedTo: { type: String, default: "Unassigned" },
  status: { type: String, default: "Open" },
  bodyPreview: { type: String, required: true },
  body: {
    content: { type: String, required: true } // Only save the content
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const TicketModel = mongoose.model("Ticket", ticketSchema);
export default TicketModel;
