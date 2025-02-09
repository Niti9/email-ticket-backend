import { TokenModel } from "../models/EmailToken/emailTokenSchema.js";
import TicketModel from "../models/EmailToken/ticketSchema.js";

class OutlookMailRepository {
  createNewTicket = async (emailId, tokenRecord, emailResponse) => {
    console.log(
      "emaild is ",
      emailId,
      "tokenRecord is",
      tokenRecord,
      "emailResponse is",
      emailResponse
    );
    // **Create a new ticket**
    const newTicket = new TicketModel({
      userId: tokenRecord?._id,
      conversationId: emailResponse?.conversationId,
      emailId,
      senderName: emailResponse?.sender?.emailAddress?.name || "Unknown Sender",
      senderEmail: emailResponse.sender.emailAddress.address,
      queryDetails: emailResponse?.subject || "No Subject",
      body: { content: emailResponse?.body?.content || "Body is Empty" },
      comments: [],
      priority: "Medium",
      status: "Open",
      responseMail: false,
      seen: false
    });

    return await newTicket.save();
  };

  EmailIdAlreadyExists = async (emailId) => {
    return await TicketModel.findOne({ emailId });
  };
}

export default new OutlookMailRepository();
