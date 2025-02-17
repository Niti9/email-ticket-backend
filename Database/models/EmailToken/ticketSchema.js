import mongoose from "mongoose";
import { TokenModel } from "./emailTokenSchema.js";

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
  emailId: { type: String, required: true, unique: true },
  ticketId: { type: String, unique: true },
  // ticketId: { type: String, required: true, unique: true },
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
      commentId: { type: String, sparse: true },
      // commentId: { type: String, default: "", sparse: true }, // sparse allows multiple null values
      // commentId: { type: String, unique: false, sparse: true }, // sparse allows multiple null values
      // commentId: { type: String, required: true, unique: true }, // Unique ID for each comment
      senderName: { type: String, required: true },
      senderEmail: { type: String, required: true },
      content: { type: String, required: true },
      // role: { type: String, enum: ["admin", "user"], required: true },
      role: { type: String, enum: ["admin", "user"] },
      sentAt: { type: Date, default: Date.now }
    }
  ],
  responseMail: { type: Boolean, default: false }, // Added field
  seen: { type: Boolean, default: false },
  attachments: [
    {
      filename: { type: String },
      data: { type: Buffer }, // Store file as binary data
      mimeType: { type: String }, // Store MIME type
      size: { type: Number } // Optional: store file size in bytes
    }
  ],
  unRead: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to generate a unique ticketId
ticketSchema.pre("save", async function (next) {
  try {
    if (!this.isNew) return next(); // Only generate ticketId for new tickets

    const user = await TokenModel.findById(this.userId);
    let userName = "Noyt"; // Default name if user is not found
    if (user && typeof user.userName === "string") {
      console.log("Raw userName from DB:", user.userName); // Debugging

      userName = user.userName.toUpperCase().replace(/\s+/g, "-");
    }

    // Find the last ticket with the same user prefix
    let lastTicket = await mongoose
      .model("Ticket")
      .findOne(
        { ticketId: { $regex: `^${userName}-\\d{4}$` } }, // Match pattern USERNAME-####
        { ticketId: 1 }
      )
      .sort({ _id: -1 }); // Sort to get the latest ticket

    let nextNumber = 1; // Default to 0001

    if (lastTicket && lastTicket.ticketId) {
      const match = lastTicket.ticketId.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    let isUnique = false;
    let ticketId = "";

    while (!isUnique) {
      ticketId = `${userName}-${String(nextNumber).padStart(4, "0")}`;

      const existingTicket = await mongoose
        .model("Ticket")
        .findOne({ ticketId });

      if (!existingTicket) {
        isUnique = true;
      } else {
        nextNumber++;
      }
    }

    this.ticketId = ticketId;
    console.log("Generated TicketId:", this.ticketId);

    next();
  } catch (error) {
    console.error("Error generating ticketId:", error);
    next(error);
  }
});
const TicketModel = mongoose.model("Ticket", ticketSchema);
export default TicketModel;
