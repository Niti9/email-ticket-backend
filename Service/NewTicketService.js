// import { TokenModel } from "../Database/models/EmailToken/emailTokenSchema.js";
// import OutlookRepo from "../Database/repository/OutlookRepo.js";

import axios from "axios";
import { TokenModel } from "../Database/models/EmailToken/emailTokenSchema.js";
import MicrosoftOutlookService from "./MicrosoftOutlookService.js";
import OutlookTicketService from "./OutlookTicketService.js";
import OutlookCommentService from "./OutlookCommentService.js";
import OutlookMailRepository from "../Database/repository/OutlookMailRepository.js";

class NewTicketService {
  webhookOperations = async (notification) => {
    try {
      const userId = notification.clientState;
      if (!userId) return console.warn("Missing userId in notification.");

      const tokenRecord = await TokenModel.findOne({ user_id: userId });
      if (!tokenRecord)
        return console.warn(`No token record for user: ${userId}`);

      const accessToken = await MicrosoftOutlookService.getAccessToken(
        tokenRecord.refresh_token
      );
      if (!accessToken?.data.access_token) {
        return console.error("Failed to retrieve access token.");
      }

      const emailId = notification.resource.split("/").pop();
      if (!emailId) return console.error("Invalid emailId in notification.");

      console.log("Processing emailId:", emailId);

      // Fetch email details
      const emailResponse = await MicrosoftOutlookService.fetchEmailDetails(
        emailId,
        accessToken.data.access_token
      );

      console.log(
        "fetchEmailsDEtails running __________________________________________________________",
        emailResponse
      );

      const existingTicket =
        await OutlookMailRepository.FindConversationIdAndEmail(
          emailId,
          emailResponse.conversationId
        );

      if (existingTicket) {
        const addComment = await OutlookCommentService.createComment(
          emailId,
          emailResponse,
          existingTicket
        );
        console.log("existing ticket are ", addComment);
        return { success: true, message: "Comment Added Successfully" };
      } else {
        const newOUtlookTicket = await OutlookTicketService.createTicket(
          emailId,
          tokenRecord,
          emailResponse,
          accessToken
        );
        console.log("new OUtlook Ticket are data are", newOUtlookTicket.data);
        return { success: true, message: "NewTicketSErvice is working " };
      }
    } catch (error) {
      console.error("Error processing notification:", error);
    }
  };
}

export default new NewTicketService();
