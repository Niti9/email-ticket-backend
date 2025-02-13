// import { TokenModel } from "../Database/models/EmailToken/emailTokenSchema.js";
// import OutlookRepo from "../Database/repository/OutlookRepo.js";

import axios from "axios";

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

  getAccessToken = async (refreshToken) => {
    try {
      const response = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            redirect_uri: process.env.REDIRECT_URI,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
            scope: "Mail.Read Mail.Send User.Read"
            // scope: "Mail.Read Mail.Send"
            // scope: "Mail.read"
          }).toString()
        }
      );
      if (!response.ok) {
        const errorMessage = await response.text();
        return {
          success: false,
          status: response.status,
          message: errorMessage
        };
      }
      const data = await response.json();

      return {
        success: true,
        message: "Access Token generated successfully",
        data: data
      };
    } catch (error) {
      console.error(
        "Error exchanging refresh token for access token:",
        error.error_description
      );
      throw error;
    }
  };
  sendConfirmationEmail = async (accessToken, userEmail, ticketId) => {
    try {
      const emailBody = {
        message: {
          subject: `Your Ticket is Raised - Ticket ID: ${ticketId}`,
          body: {
            contentType: "Text",
            content: `We have received your request. Your Ticket ID is '${ticketId}'. We will resolve your issue as soon as possible.`
          },
          toRecipients: [{ emailAddress: { address: userEmail } }]
          // ccRecipients: [{ emailAddress: { address: adminEmail } }]
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

      if (!emailResponse.ok) {
        throw new Error(`Failed to send email: ${emailResponse.statusText}`);
      }

      console.log(
        `Confirmation email sent to ${userEmail}: ${emailResponse.status}`
      );
      return { success: true, message: "Email sent successfully" };
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      return { success: false, message: error.message };
    }
  };

  fetchAttachments = async (messageId, accessToken) => {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      console.log(
        "response data value for email attachement are _--------------------------------"
          .response?.data?.value
      );
      return response.data.value; // Array of attachments
    } catch (error) {
      console.error("Error fetching attachments:", error);
      return [];
    }
  };
}
export default new MicrosoftOutlookServices();
