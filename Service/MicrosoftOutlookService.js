// import { TokenModel } from "../Database/models/EmailToken/emailTokenSchema.js";
// import OutlookRepo from "../Database/repository/OutlookRepo.js";

import axios from "axios";
import TicketModel from "../Database/models/EmailToken/ticketSchema.js";

class MicrosoftOutlookServices {
  // Fetch email details function
  fetchEmailDetails = async (emailId, accessToken) => {
    try {
      const emailResponse = await axios.get(
        `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      return emailResponse.data;
    } catch (error) {
      console.error(
        `Error fetching email details for emailId: ${emailId}`,
        error
      );
      return null;
    }
  };
  fetchEmailDetails2 = async (emailId, accessToken) => {
    try {
      const emailResponse = await axios.get(
        `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      return emailResponse.data;
    } catch (error) {
      console.error(
        `Error fetching email details for emailId: ${emailId}`,
        error
      );
      return null;
    }
  };
  automaticSubscription = async (
    userId,
    accessToken,
    firstTime = false,
    cronTime = false
  ) => {
    try {
      let expirationDateTime;

      // Set expiration based on whether it's the first time or cron renewal
      if (firstTime) {
        // For first-time subscription, 7 days from now
        expirationDateTime = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(); // 7 days from now
      } else if (cronTime) {
        // For renewal, 6 days from now
        expirationDateTime = new Date(
          Date.now() + 6 * 24 * 60 * 60 * 1000
        ).toISOString(); // 6 days from now
      } else {
        // Default fallback: 1 minute (for testing purposes)
        // expirationDateTime = new Date(Date.now() + 60000).toISOString(); // 1 minute from now
        const message = "expiration time is not defined";
        return message;
      }

      const response = await fetch(
        "https://graph.microsoft.com/v1.0/subscriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            changeType: "created",
            notificationUrl:
              // "https://email-ticket-backend.vercel.app/api/ticket/tickets/webhook",
              process.env.NOTIFICATION_URL,
            resource: "me/messages",
            expirationDateTime: expirationDateTime,
            clientState: userId
          })
        }
      );

      if (!response.ok) {
        const errorMessage = await response.text();
        return {
          success: false,
          status: response.status,
          message: errorMessage,
          data: null
        };
      }

      const data = await response.json();

      return {
        success: true,
        message: "Subscription created successfully",
        data: data
      };
    } catch (error) {
      console.error("Error creating subscription:", error.message);
      throw error;
    }
  };

  allOperations = async (tokenRecord, emailId, accessToken) => {
    try {
      // Fetch email details
      const emailResponse = await this.fetchEmailDetails(emailId, accessToken);

      console.log(
        "fetchEmailsDEtails running __________________________________________________________",
        emailResponse
      );

      const conversationId = emailResponse.conversationId;
      const senderEmail = emailResponse.sender.emailAddress.address;
      const senderName =
        emailResponse.sender.emailAddress.name || "Unknown Sender";

      // if (senderEmail === "nitinnoyt829@outlook.com") {
      //   console.log("sender mail admin ki hai ");
      //   return;
      // }
      // **Check for existing tickets**
      const existingTicket = await TicketModel.findOne({
        $or: [{ conversationId }, { emailId }]
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

      // **Prevent duplicate ticket creation**
      const alreadyExists = await TicketModel.findOne({ emailId });
      if (alreadyExists) {
        console.log(`Skipping duplicate ticket for emailId: ${emailId}`);
        return;
      }
      console.log("alreadyExists are ", alreadyExists);

      // **Create a new ticket**
      const newTicket = new TicketModel({
        userId: tokenRecord._id,
        conversationId,
        emailId,
        senderName,
        senderEmail,
        queryDetails: emailResponse.subject || "No Subject",
        body: { content: emailResponse.body.content || "Body is Empty" },
        comments: [],
        priority: "Medium",
        status: "Open",
        responseMail: false // ✅ Ensure initial state is false
      });

      await newTicket.save();
      console.log("New ticket created:", newTicket.ticketId);

      // Call the `testing` API to send response email
      const response = await axios.post(
        "https://email-ticket-backend.vercel.app/api/ticket/testing",
        {
          accessToken: accessToken,
          userEmail: senderEmail,
          ticketId: newTicket.ticketId
        }
      );

      console.log("response is", response.data);
      return { success: true, message: "scuceadlkjsldk" };
    } catch (error) {
      console.log("hasSentREsponse error is here ", error);
    }
  };
  sendConfirmationEmail = async (accessToken, userEmail, ticketId) => {
    try {
      if (!accessToken) {
        console.error("Access token is missing!");
        return { success: false, message: "Access token is required" };
      }

      if (!userEmail) {
        console.error("User email is missing!");
        return { success: false, message: "User email is required" };
      }

      console.log(
        `Sending confirmation email to ${userEmail} for Ticket ID: ${ticketId}`
      );

      // Email Body
      const emailBody = {
        message: {
          subject: `Your Ticket is Raised - Ticket ID: ${ticketId}`,
          body: {
            contentType: "Text",
            content: `We have received your request. Your Ticket ID is '${ticketId}'. We will resolve your issue as soon as possible.`
          },
          toRecipients: [{ emailAddress: { address: userEmail } }]
        },
        saveToSentItems: "true"
      };

      // Send Email
      const emailResponse = await fetch(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(emailBody)
        }
      );

      const responseText = await emailResponse.text();

      if (!emailResponse.ok) {
        console.error(
          `Failed to send email to ${userEmail}. Status: ${emailResponse.status}, Response: ${responseText}`
        );
        return {
          success: false,
          message: `Failed to send email: ${responseText}`
        };
      }

      console.log(`✅ Confirmation email successfully sent to ${userEmail}`);
      // ✅ Update ticket's responseMail to true
      await TicketModel.updateOne(
        { ticketId: ticketId },
        { $set: { responseMail: true } }
      );
      return { success: true, message: "Email sent successfully" };
    } catch (error) {
      console.error("🚨 Error sending confirmation email:", error);
      return { success: false, message: error.message };
    }
  };
}
export default new MicrosoftOutlookServices();
