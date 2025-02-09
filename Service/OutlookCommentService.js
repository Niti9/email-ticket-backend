import axios from "axios";
import MicrosoftOutlookService from "./MicrosoftOutlookService.js";
import TicketModel from "../Database/models/EmailToken/ticketSchema.js";

class OutlookCommentService {
  createComment = async (emailResponse) => {
    // **Check for existing tickets**
    const existingTicket = await TicketModel.findOne({
      $or: [
        { conversationId: emailResponse.conversationId },
        { emailId: emailId }
      ]
    });

    if (existingTicket) {
      console.log(
        `Existing ticket found for emailId: ${emailId} and ${conversationId}`
      );

      // If this is a reply, add it as a comment
      if (existingTicket.conversationId === conversationId) {
        const isDuplicateComment = existingTicket.comments.some(
          (comment) => comment.commentId === emailId
        );
        if (!isDuplicateComment) {
          existingTicket.comments.push({
            commentId: emailId,
            senderName,
            senderEmail,
            content: emailResponse.body.content || "No content",
            role: "user",
            sentAt: new Date()
          });
          await existingTicket.save();
          console.log("Reply added as a comment.");
        } else {
          console.log("Duplicate comment detected, skipping.");
        }
      }
      return;
    }
  };
}
export default new OutlookCommentService();
