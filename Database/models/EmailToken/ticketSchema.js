import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderEmail: { type: String, required: true },
  queryDetails: { type: String, required: true },
  priority: { type: String, default: "Medium" }, // Default priority
  assignedTo: { type: String, default: "Unassigned" },
  status: { type: String, default: "Open" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const TicketModel = mongoose.model("Ticket", ticketSchema);
export default TicketModel;
