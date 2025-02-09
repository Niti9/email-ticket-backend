import axios from "axios";
import MicrosoftOutlookService from "./MicrosoftOutlookService.js";
import TicketModel from "../Database/models/EmailToken/ticketSchema.js";
import OutlookMailRepository from "../Database/repository/OutlookMailRepository.js";

class OutlookTicketService {
  createTicket = async (emailId, tokenRecord, emailResponse) => {
    const conversationId = emailResponse.conversationId;
    const senderEmail = emailResponse.sender.emailAddress.address;
    const senderName =
      emailResponse.sender.emailAddress.name || "Unknown Sender";

    // if (senderEmail === "nitinnoyt829@outlook.com") {
    //   console.log("sender mail admin ki hai ");
    //   const conversationExist = await TicketModel.findOne({
    //     conversationId
    //   });
    //   if (conversationExist) {
    //     console.log(
    //       "our conversationg already exists +++++++++++++++++",
    //       conversationExist
    //     );
    //   }

    //   return;
    // }
    // // **Check for existing tickets**
    // const existingTicket = await TicketModel.findOne({
    //   $or: [{ conversationId }, { emailId }]
    // });

    // if (existingTicket) {
    //   console.log(
    //     `Existing ticket found for emailId: ${emailId} and ${conversationId}`
    //   );

    //   // If this is a reply, add it as a comment
    //   if (existingTicket.conversationId === conversationId) {
    //     const isDuplicateComment = existingTicket.comments.some(
    //       (comment) => comment.commentId === emailId
    //     );
    //     if (!isDuplicateComment) {
    //       existingTicket.comments.push({
    //         commentId: emailId,
    //         senderName,
    //         senderEmail,
    //         content: emailResponse.body.content || "No content",
    //         role: "user",
    //         sentAt: new Date()
    //       });
    //       await existingTicket.save();
    //       console.log("Reply added as a comment.");
    //     } else {
    //       console.log("Duplicate comment detected, skipping.");
    //     }
    //   }
    //   return;
    // }

    // **Prevent duplicate ticket creation**

    // const alreadyExists = OutlookMailRepository.EmailIdAlreadyExists(emailId);
    // if (alreadyExists) {
    //   console.log(`Skipping duplicate ticket for emailId: ${emailId}`);
    //   return { success: false, message: "alreadyExists error" };
    // }
    // console.log("alreadyExists are ", alreadyExists);

    console.log(
      "emailResponse conversationId is",
      emailResponse.conversationId
    );
    const create = await OutlookMailRepository.createNewTicket(
      tokenRecord,
      emailResponse
    );
    console.log("New ticket created:))))))))))))))))", create.ticketId);
    return {
      success: true,
      message: "New Ticket Generate successfully",
      data: create
    };

    // // Call the `testing` API to send response email
    // const response = await axios.post(
    //   "https://email-ticket-backend.vercel.app/api/ticket/testing",
    //   {
    //     accessToken: accessToken.access_token,
    //     userEmail: senderEmail,
    //     ticketId: newTicket.ticketId
    //   }
    // );

    // console.log("response is", response.data);

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
