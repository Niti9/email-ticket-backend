import axios from "axios";
import MicrosoftOutlookService from "./MicrosoftOutlookService.js";
import TicketModel from "../Database/models/EmailToken/ticketSchema.js";
import OutlookMailRepository from "../Database/repository/OutlookMailRepository.js";

class OutlookTicketService {
  createTicket = async (emailId, tokenRecord, emailResponse, accessToken) => {
    const conversationId = emailResponse.conversationId;
    const ticketId = emailResponse.ticketId;
    const senderEmail = emailResponse.sender.emailAddress.address;
    const senderName =
      emailResponse.sender.emailAddress.name || "Unknown Sender";

    const create = await OutlookMailRepository.createNewTicket(
      emailId,
      tokenRecord,
      emailResponse,
      accessToken
    );
    // return {
    //   success: true,
    //   message: "New Ticket Generate successfully",
    //   data: create
    // };

    // // // // Call the `testing` API to send response email
    // const response = await axios.post(
    //   "https://email-ticket-backend.vercel.app/api/ticket/testing",
    //   {
    //     accessToken: accessToken,
    //     userEmail: senderEmail,
    //     ticketId: emailId
    //   }
    // );

    const response = MicrosoftOutlookService.sendResponseMailToUser(
      accessToken,
      senderEmail,
      emailId
    );
    if (response.success) {
      return {
        success: true,
        message: "New Ticket Generate successfully",
        data: create
      };
    }
    return {
      success: false,
      message: "New Ticket Generate Failed 🙅",
      data: create
    };
    // return {
    //   success: true,
    //   message: "New Ticket Generate successfully",
    //   data: create
    // };
  };
}
export default new OutlookTicketService();
