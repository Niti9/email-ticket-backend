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

        // Process each attachment
        attachments = await Promise.all(
          emailAttachments.map(async (attachment) => {
            if (
              attachment["@odata.type"] === "#microsoft.graph.fileAttachment"
            ) {
              const fileBuffer = Buffer.from(attachment.contentBytes, "base64");

              // Upload to S3
              const s3Url = await uploadToS3(
                fileBuffer,
                attachment.name,
                attachment.contentType
              );
              return {
                filename: attachment.name,
                url: s3Url,
                mimeType: attachment.contentType,
                size: attachment.size
              };
            }
            return null;
          })
        );
      }

      // Save ticket with attachment URLs
      const newTicket = new TicketModel({
        userId: tokenRecord?._id,
        conversationId: emailResponse?.conversationId,
        emailId: emailResponse.id,
        senderName:
          emailResponse?.sender?.emailAddress?.name || "Unknown Sender",
        senderEmail: emailResponse.sender.emailAddress.address,
        queryDetails: emailResponse?.subject || "No Subject",
        body: { content: emailResponse?.body?.content || "Body is Empty" },
        attachments: attachments.filter((a) => a !== null), // Remove nulls
        comments: [],
        priority: "Medium",
        status: "Open",
        responseMail: false,
        seen: false
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
