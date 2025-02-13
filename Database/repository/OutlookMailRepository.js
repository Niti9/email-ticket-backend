import MicrosoftOutlookService from "../../Service/MicrosoftOutlookService.js";
import { uploadToS3 } from "../../Service/s3uploader.js";
import { TokenModel } from "../models/EmailToken/emailTokenSchema.js";
import TicketModel from "../models/EmailToken/ticketSchema.js";

class OutlookMailRepository {
  // Extract attachments from emailResponse

  createNewTicket = async (
    emailId,
    tokenRecord,
    emailResponse,
    accessToken
  ) => {
    try {
      let attachments = [];

      if (emailResponse.hasAttachments) {
        const emailAttachments = await MicrosoftOutlookService.fetchAttachments(
          emailResponse.id,
          accessToken
        );

        attachments = emailAttachments
          .map((attachment) => {
            if (
              attachment["@odata.type"] === "#microsoft.graph.fileAttachment"
            ) {
              return {
                filename: attachment.name,
                fileType: attachment.contentType, // e.g., "image/png", "application/pdf"
                data: Buffer.from(attachment.contentBytes, "base64") // Convert to Buffer
              };
            }
            return null;
          })
          .filter((a) => a !== null);
      }

      console.log("attachements are", attachments);
      // Save ticket with attachments
      const newTicket = new TicketModel({
        userId: tokenRecord?._id,
        conversationId: emailResponse?.conversationId,
        emailId: emailResponse.id,
        senderName:
          emailResponse?.sender?.emailAddress?.name || "Unknown Sender",
        senderEmail: emailResponse.sender.emailAddress.address,
        queryDetails: emailResponse?.subject || "No Subject",
        body: { content: emailResponse?.body?.content || "Body is Empty" },
        attachments: attachments,
        createdAt: new Date()
      });

      return await newTicket.save();
    } catch (error) {
      console.error("Error creating ticket:", error);
      throw error;
    }
  };

  // createNewTicket = async (
  //   emailId,
  //   tokenRecord,
  //   emailResponse,
  //   accessToken
  // ) => {
  //   // **Create a new ticket**
  //   const newTicket = new TicketModel({
  //     userId: tokenRecord?._id,
  //     conversationId: emailResponse?.conversationId,
  //     emailId: emailResponse.id,
  //     senderName: emailResponse?.sender?.emailAddress?.name || "Unknown Sender",
  //     senderEmail: emailResponse.sender.emailAddress.address,
  //     queryDetails: emailResponse?.subject || "No Subject",
  //     body: { content: emailResponse?.body?.content || "Body is Empty" },
  //     comments: [],
  //     priority: "Medium",
  //     status: "Open",
  //     responseMail: false,
  //     seen: false
  //   });

  //   return await newTicket.save();
  // };

  EmailIdAlreadyExists = async (emailId) => {
    return await TicketModel.findOne({ emailId });
  };

  FindConversationIdAndEmail = async (emailId, conversationId) => {
    return await TicketModel.findOne({ conversationId });
    // return await TicketModel.findOne({
    //   $or: [{ conversationId: conversationId }, { emailId: emailId }]
    // });
  };

  Addcomment = async (emailId, emailResponse, existingTicket) => {
    existingTicket.comments.push({
      commentId: emailResponse.id,
      senderName: emailResponse.sender.emailAddress.name || "Unknown Sender",
      senderEmail: emailResponse.sender.emailAddress.address,
      content: emailResponse.body.content || "No content",
      role: "user",
      sentAt: new Date()
    });
    return await existingTicket.save();
  };
}

export default new OutlookMailRepository();
