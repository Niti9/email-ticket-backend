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
      console.log("user ids is", userId);
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

      console.log("notification is ", notification);
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
      console.log(" first thing ", emailResponse.from.emailAddress.address);
      console.log("second thing is ", tokenRecord.user_outlook_email);

      // get the email details first and then comparee with the appuserschema . email
      // example
      if (
        emailResponse?.from?.emailAddress?.address ===
        tokenRecord?.user_outlook_email
      ) {
        console.log("Ignoring self-triggered notification");
        return {
          success: false,
          message: `Ignoring message from ${tokenRecord.user_outlook_email}`
        };
      }

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
