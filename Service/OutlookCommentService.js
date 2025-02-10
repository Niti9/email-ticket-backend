import axios from "axios";
import MicrosoftOutlookService from "./MicrosoftOutlookService.js";
import TicketModel from "../Database/models/EmailToken/ticketSchema.js";
import OutlookMailRepository from "../Database/repository/OutlookMailRepository.js";

class OutlookCommentService {
  createComment = async (emailId, emailResponse, existingTicket) => {
    const conversationId = emailResponse.conversationId;

    // If this is a reply, add it as a comment
    if (existingTicket.conversationId === conversationId) {
      const isDuplicateComment = existingTicket.comments.some(
        (comment) => comment.commentId === emailId
      );
      if (!isDuplicateComment) {
        const saveComment = await OutlookMailRepository.Addcomment(
          emailId,
          emailResponse,
          existingTicket
        );
        console.log("Reply added as a comment.", saveComment);
        return {
          success: true,
          message: "Reply added as comment in Database"
        };
      } else {
        console.log("Duplicate comment detected, skipping.");
      }
    }
    return {
      success: false,
      message: "Sorry Conversation Id not match with any existing ticket"
    };
  };
}
export default new OutlookCommentService();
