import axios from "axios";
import MicrosoftOutlookService from "./MicrosoftOutlookService.js";
import TicketModel from "../Database/models/EmailToken/ticketSchema.js";
import OutlookMailRepository from "../Database/repository/OutlookMailRepository.js";

class OutlookTicketService {
  createTicket = async (emailId, tokenRecord, emailResponse, accessToken) => {
    const conversationId = emailResponse.conversationId;
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

    // Call the `testing` API to send response email
    const response = await axios.post(
      "https://email-ticket-backend.vercel.app/api/ticket/testing",
      {
        accessToken: accessToken.data.access_token,
        userEmail: senderEmail,
        ticketId: emailId
        // ticketId: newTicket.ticketId
      }
    );

    console.log(
      "sent response back mail response are ***********",
      response.data
    );

    return {
      success: true,
      message: "New Ticket Generate successfully",
      data: create
    };

    // const hasSentResponse = await TicketModel.findOne({
    //   emailId,
    //   responseMail: true
    // });
    // try {
    //   if (!hasSentResponse) {
    //     console.log("Sending confirmation email...");
    //     //// ✅ Send response mail only if this new ticket hasn’t been responded to
    //     if (!newTicket.responseMail) {
    //       console.log("Sending confirmation email...");
    //       const mailSent =
    //         await MicrosoftOutlookService.sendConfirmationEmail(
    //           accessToken.access_token,
    //           senderEmail,
    //           newTicket.ticketId
    //         );

    //       if (mailSent.success) {
    //         // await TicketModel.updateOne(
    //         //   { _id: newTicket._id }, // ✅ Update only the new ticket
    //         //   { $set: { responseMail: true } }
    //         // );
    //         console.log(
    //           `✅ Response mail sent for ticket: ${newTicket.ticketId}`
    //         );
    //       } else {
    //         console.error(
    //           `❌ Failed to send confirmation email for ticket: ${newTicket.ticketId}`
    //         );
    //       }
    //     } else {
    //       console.log(
    //         `Skipping response email for ticket: ${newTicket.ticketId}, already sent.`
    //       );
    //     }
    //   }
    // } catch (error) {
    //   console.log("hasSentREsponse error is here ", error);
    // }
  };
}
export default new OutlookTicketService();
