import axios from "axios";
import { TokenModel } from "../Database/models/EmailToken/emailTokenSchema.js";
import MicrosoftOutlookService from "./MicrosoftOutlookService.js";
import OutlookTicketService from "./OutlookTicketService.js";
import OutlookCommentService from "./OutlookCommentService.js";
import OutlookMailRepository from "../Database/repository/OutlookMailRepository.js";

class NewTicketService {
  webhookOperations = async (notification) => {
    try {
      console.log("newticketService we have notification is ", notification);
      const userId = notification.clientState;
      if (!userId) return console.warn("Missing userId in notification.");

      const tokenRecord = await TokenModel.findOne({ user_id: userId });
      console.log("token record is ", tokenRecord);
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

      // Fetch email details
      const emailResponse = await MicrosoftOutlookService.fetchEmailDetails(
        emailId,
        accessToken.data.access_token
      );

      if (!emailResponse.success) {
        throw new Error(
          `fetchEmailDetails threw an error: ${emailResponse.message}`
        );
      }

      if (
        emailResponse.data.from?.emailAddress?.address &&
        tokenRecord.user_outlook_email &&
        emailResponse.data.from.emailAddress.address.toLowerCase().trim() ===
          tokenRecord.user_outlook_email.toLowerCase().trim()
      ) {
        throw new Error(
          `Ignoring self-triggered notification: ${tokenRecord.user_outlook_email}`
        );
      }

      const existingTicket =
        await OutlookMailRepository.FindConversationIdAndEmail(
          emailId,
          emailResponse.data.conversationId
        );

      if (existingTicket) {
        const addComment = await OutlookCommentService.createComment(
          emailId,
          emailResponse.data,
          existingTicket
        );
        console.log("existing ticket are ", addComment);
        return { success: true, message: "Comment Added Successfully" };
      } else {
        const newOUtlookTicket = await OutlookTicketService.createTicket(
          emailId,
          tokenRecord,
          emailResponse.data,
          accessToken.data.access_token
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
