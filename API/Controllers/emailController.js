import axios from "axios";
import { TokenModel } from "../../Database/models/EmailToken/emailTokenSchema.js";
import TicketModel from "../../Database/models/EmailToken/ticketSchema.js";
import cron from "node-cron";
import MicrosoftOutlookService from "../../Service/MicrosoftOutlookService.js";
import NewTicketService from "../../Service/NewTicketService.js";
import OutlookMailRepository from "../../Database/repository/OutlookMailRepository.js";
class EmailControllers {
  seenAllTickets = async (req, res) => {
    try {
      const updated = await TicketModel.updateMany(
        { seen: false },
        { $set: { seen: true } }
      ); //seen false into see true

      if (updated.matchedCount === 0) {
        return res.status(404).json({ message: "No unseen tickets found" });
      }

      res.json({ message: "All notifications cleared" });
    } catch (error) {
      res.status(500).json({ message: "Error marking all as seen" });
    }
  };
  seenTickets = async (req, res) => {
    try {
      await TicketModel.findByIdAndUpdate(req.params.id, { seen: true });
      res.json({ message: "Ticket marked as seen" });
    } catch (error) {
      res.status(500).json({ message: "Error marking ticket as seen" });
    }
  };
  unseenTickets = async (req, res) => {
    try {
      const unseenTickets = await TicketModel.find({ seen: false });
      return res.status(200).json(unseenTickets);
    } catch (error) {
      res.status(500).json({ message: "Error fetching unseen tickets" });
    }
  };
  sendResponseMailToUser = async (req, res) => {
    try {
      const { accessToken, userEmail, ticketId } = req.body;
      if (!accessToken) {
        console.error("Access token is missing!");
        return { success: false, message: "Access token is required" };
      }

      if (!userEmail) {
        console.error("User email is missing!");
        return { success: false, message: "User email is required" };
      }

      // // **Check if response mail was already sent**
      const existingTicket = await OutlookMailRepository.EmailIdAlreadyExists(
        ticketId
      );
      // const existingTicket = await TicketModel.findOne({ ticketId });
      if (existingTicket?.responseMail) {
        console.log(
          `⚠️ Email already sent for Ticket ID: ${ticketId}, skipping.`
        );
        return res
          .status(200)
          .json({ success: false, message: "Email already sent" });
      }

      // Email Body
      const emailBody = {
        message: {
          subject: `Your Ticket is Raised - Ticket ID: ${existingTicket.ticketId}`,
          // subject: `Your Ticket is Raised - Ticket ID: ${ticketId}`,
          body: {
            contentType: "Text",
            content: `We have received your request. Your Ticket ID is '${existingTicket.ticketId}'. We will resolve your issue as soon as possible.`
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

      // ✅ Update ticket's responseMail to true
      await TicketModel.updateOne(
        { emailId: ticketId },
        { $set: { responseMail: true } }
      );
      // await TicketModel.updateOne(
      //   { ticketId: ticketId },
      //   { $set: { responseMail: true } }
      // );
      return res.status(200).json({
        success: true,
        message: `✅ Confirmation email successfully sent to this email${userEmail}`
      });
    } catch (error) {
      console.error("🚨 Error sending confirmation email:", error);
      return { success: false, message: error.message };
    }
  };
  // Method to check if refresh token exists, and if it does, get the access token
  handleConsent = async (req, res) => {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).send("User ID is required.");
    }

    const tokenRecord = await TokenModel.findOne({ user_id: userId });

    if (tokenRecord) {
      try {
        const accessToken = await this.getAccessToken(
          tokenRecord.refresh_token
        );
        // const subscription = await this.automaticSubscription(
        //   userId,
        //   accessToken.access_token
        // );
        return res.status(200).send({
          // subscription: subscription,
          access_token: accessToken.access_token,
          expires_in: accessToken.expires_in
        });
      } catch (error) {
        console.error("Failed to fetch access token:", error);
        return res.status(500).send("Failed to fetch access token.");
      }
    } else {
      const redirectUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}&scope=Mail.Read Mail.Send User.Readoffline_access&state=${userId}&prompt=consent`;
      // const redirectUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}&scope=Mail.Read offline_access&state=${userId}&prompt=consent`;
      return res.status(200).send({ redirectUrl });
    }
  };

  // Callback to handle the token exchange after consent
  getEmailCode = async (req, res) => {
    try {
      // const code = req.query.code;
      // const userId = req.query.state; // State contains the user_id
      const { code, userId } = req.body;

      if (!code || !userId) {
        return res
          .status(400)
          .send("Authorization code or user ID not found in the callback URL.");
      }

      // // res.redirect(
      // //   `http://localhost:5173/integration/outlookcallback?code=${code}&state=${userId}`
      // // );

      // Exchange the authorization code for refresh token
      const tokenResponse = await MicrosoftOutlookService.getRefreshToken(
        code,
        userId,
        appusername
      );

      const subscription = await MicrosoftOutlookService.automaticSubscription(
        userId,
        tokenResponse.data.access_token,
        true
      );

      console.log("Tokens saved to database.");
      // res.send("Authorization successful. You can now log in.");
      res.status(200).json({ success: true, data: tokenResponse });
    } catch (error) {
      console.error("Error in getEmailCode:", error.message);
      res
        .status(500)
        .send("An error occurred during the authorization process.");
    }
  };

  // // Exchange authorization code for a refresh token
  // getRefreshToken = async (code) => {
  //   try {
  //     const response = await axios.post(
  //       "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  //       new URLSearchParams({
  //         client_id: process.env.CLIENT_ID,
  //         client_secret: process.env.CLIENT_SECRET,
  //         redirect_uri: process.env.REDIRECT_URI,
  //         code: code,
  //         grant_type: "authorization_code",
  //         scope: "Mail.Read offline_access"
  //       }).toString(),
  //       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  //     );

  //     console.log("this is refresh token here", response.data);
  //     return response.data;
  //   } catch (error) {
  //     console.error("Error exchanging code for refresh token:", error);
  //     // console.error("Error exchanging code for refresh token:", error.message);
  //     throw error;
  //   }
  // };

  getRefreshToken = async (code) => {
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
            code: code,
            grant_type: "authorization_code",
            scope: "Mail.Read Mail.Send User.Read"
            // scope: "Mail.Read offline_access"
          }).toString()
        }
      );

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorMessage}`
        );
      }

      const data = await response.json();
      console.log("This is the refresh token:", data);
      return data;
    } catch (error) {
      console.error("Error exchanging code for refresh token:", error);
      // console.error("Error exchanging code for refresh token:", error.message);
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
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorMessage}`
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(
        "Error exchanging refresh token for access token:",
        error.error_description
      );
      throw error;
    }
  };

  automaticSubscription = async (userId, accessToken) => {
    try {
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
            // notificationUrl: "https://email-ticket-backend.vercel.app/webhook",
            notificationUrl:
              "https://email-ticket-backend.vercel.app/api/ticket/tickets/webhook",
            resource: "me/messages",
            expirationDateTime: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
            // expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            // expirationDateTime: new Date(
            //   Date.now() + 7 * 24 * 60 * 60 * 1000
            // ).toISOString(), // 7 days from now
            // clientState: "yourClientState"
            clientState: userId
          })
        }
      );

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorMessage}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating subscription:", error.message);
      throw error;
    }
  };

  // // createSubscription = async (accessToken, userId) => {
  // createSubscription = async (req, res) => {
  //   try {
  //     // const accessToken = await getAccessToken();
  //     // const emailController = new EmailControllers();
  //     // const accessToken = await emailController.getAccessToken(refreshToken);

  //     // Check if the refresh token exists in the database for this user
  //     const userId = req.query.user_id; // Assume user_id is sent from the frontend
  //     const tokenRecord = await TokenModel.findOne({ user_id: userId });
  //     const accessToken = await this.getAccessToken(tokenRecord.refresh_token);
  //     console.log(
  //       "This is acccess Token which we passed to create Subscription ......................",
  //       userId,
  //       tokenRecord,
  //       accessToken.access_token
  //     );

  //     const response = await axios.post(
  //       "https://graph.microsoft.com/v1.0/subscriptions",
  //       {
  //         changeType: "created",
  //         // notificationUrl: "https://your-vercel-project.vercel.app/webhook",
  //         notificationUrl: "https://email-ticket-backend.vercel.app/webhook",
  //         resource: "me/messages",
  //         expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  //         // clientState: "yourClientState"
  //         clientState: userId
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${accessToken.access_token}`,
  //           "Content-Type": "application/json"
  //         }
  //       }
  //     );

  //     // console.log("Subscription created:", response.data);
  //     console.log("Subscription created:", response.data);
  //     // console.log("Subscription initialized:", response.data.id);
  //     // return response.data;
  //     return res.status(200).json(response.data);
  //   } catch (error) {
  //     console.error("Error creating subscription:", error.response.data);
  //     throw error;
  //   }
  // };

  getMessage = async (accessToken) => {
    try {
      const response = await axios.get(
        "https://graph.microsoft.com/v1.0/me/messages",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      console.log(response.data);
    } catch (error) {
      console.error("API Error:", error.response?.data || error.message);
    }
  };

  EditTicket = async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Update the ticket in the database
      const updatedTicket = await TicketModel.findByIdAndUpdate(id, updates, {
        new: true // Return the updated document
      });

      if (!updatedTicket) {
        return res.status(404).send("Ticket not found.");
      }

      res.status(200).json(updatedTicket);
    } catch (error) {
      console.error("Error updating ticket:", error.message);
      res.status(500).send("Error updating ticket.");
    }
  };
  webhook = async (req, res) => {
    try {
      if (req.query.validationToken) {
        console.log("Validation Token Received:", req.query.validationToken);
        return res.status(200).send(req.query.validationToken);
      }

      const notifications = req.body.value;
      console.log("notifications are", notifications);
      if (!notifications || notifications.length === 0) {
        console.log("No notifications received.");
        return res.status(204).send("No notifications received.");
      }

      // const notification = {
      //   subscriptionId: "109b4719-ebdb-401f-9990-4c3eb027ba0e",
      //   subscriptionExpirationDateTime: "2025-02-17T18:30:01.43+00:00",
      //   changeType: "created",
      //   resource:
      //     "Users/924304495c60cab3/Messages/AQMkADAwATM0MDAAMi04NjNhLWEzMGMtMDACLTAwCgBGAAADaP9ss4XKygBEvIXLgwOx84EHAMD7k9GdyVtDiHguHJ5J8FYAAAIBDAAAAMD7k9GdyVtDiHguHJ5J8FYAAAAT5YUnAAAA",
      //   resourceData: {
      //     "@odata.type": "#Microsoft.Graph.Message",
      //     "@odata.id":
      //       "Users/924304495c60cab3/Messages/AQMkADAwATM0MDAAMi04NjNhLWEzMGMtMDACLTAwCgBGAAADaP9ss4XKygBEvIXLgwOx84EHAMD7k9GdyVtDiHguHJ5J8FYAAAIBDAAAAMD7k9GdyVtDiHguHJ5J8FYAAAAT5YUnAAAA",
      //     "@odata.etag": 'W/"CQAAABYAAADA+5PRnclbQ4h4LhyeSfBWAAAT4NUr"',
      //     id: "AQMkADAwATM0MDAAMi04NjNhLWEzMGMtMDACLTAwCgBGAAADaP9ss4XKygBEvIXLgwOx84EHAMD7k9GdyVtDiHguHJ5J8FYAAAIBDAAAAMD7k9GdyVtDiHguHJ5J8FYAAAAT5YUnAAAA"
      //   },
      //   clientState: "6746e5a86a0dee2ed8b2cd4f",
      //   tenantId: ""
      // };
      await Promise.all(
        notifications.map(async (notification) => {
          const data = await NewTicketService.webhookOperations(notification);
          console.log("data is", data);
        })
      );

      return res.status(202).send("Notifications processed.");
    } catch (error) {
      console.error("Error processing webhook:", error);
      return res.status(500).send("Internal Server Error");
    }
  };

  // webhook = async (req, res) => {
  //   try {
  //     // Handle validation token
  //     if (req.query.validationToken) {
  //       console.log("Validation Token Received:", req.query.validationToken);
  //       return res.status(200).send(req.query.validationToken);
  //     }

  //     // Log the received notification
  //     console.log("Notification Received:", req.body);

  //     const notifications = req.body.value;
  //     if (!notifications || notifications.length === 0) {
  //       console.log("No notifications received.");
  //       return res.status(204).send("No notifications received.");
  //     }

  //     for (const notification of notifications) {
  //       try {
  //         // Extract email details
  //         const userId = notification.clientState; // Assume user_id is sent from the frontend
  //         if (!userId) {
  //           console.warn("Missing userId in notification.");
  //           continue;
  //         }

  //         const tokenRecord = await TokenModel.findOne({ user_id: userId });

  //         if (!tokenRecord) {
  //           console.warn(`No token record found for user_id: ${userId}`);
  //           continue; // Skip this notification if no token is found
  //         }

  //         const accessToken = await this.getAccessToken(
  //           tokenRecord.refresh_token
  //         ); // Get your OAuth token
  //         if (!accessToken?.access_token) {
  //           console.error("Failed to retrieve access token.");
  //           continue;
  //         }

  //         const emailId = notification.resource.split("/").pop(); // Extract email ID from resource
  //         if (!emailId) {
  //           console.error("Invalid emailId in notification.");
  //           continue;
  //         }

  //         // Fetch email details from Microsoft Graph API
  //         const emailResponse = await axios.get(
  //           `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
  //           {
  //             headers: {
  //               Authorization: `Bearer ${accessToken.access_token}`
  //             }
  //           }
  //         );

  //         const emailData = emailResponse.data;
  //         const conversationId = emailData.conversationId; // Extract conversationId from the email data
  //         const senderEmail = emailData.sender.emailAddress.address;
  //         const senderName =
  //           emailData.sender.emailAddress.name || "Unknown Sender";

  //         // Check for duplicate tickets by `emailId` or `conversationId`
  //         const existingTicket = await TicketModel.findOne({
  //           $or: [{ emailId: emailId }, { conversationId }]
  //           // $or: [{ ticketId: emailId }, { conversationId }]
  //         });

  //         if (existingTicket) {
  //           console.log(
  //             `Duplicate ticket detected for emailId: ${emailId} or conversationId: ${conversationId}`
  //           );

  //           // If conversation exists, update comments
  //           if (existingTicket.conversationId === conversationId) {
  //             console.log(
  //               `Adding a reply to the existing conversation for conversationId: ${conversationId}`
  //             );

  //             // Check if the comment already exists based on `emailId`
  //             const isDuplicateComment = existingTicket.comments.some(
  //               (comment) => comment.commentId === emailId
  //             );

  //             if (isDuplicateComment) {
  //               console.log(
  //                 `Duplicate comment detected id==> ${conversationId}`
  //               );
  //               continue; // Skip adding this duplicate comment
  //             }

  //             existingTicket.comments.push({
  //               commentId:
  //                 emailData.id || new mongoose.Types.ObjectId().toString(), //ensure unique id is there
  //               senderName,
  //               senderEmail,
  //               content: emailData.body.content || "No content", // Reply content
  //               role:
  //                 emailData.sender.emailAddress.address ===
  //                 "nitinnoyt829@outlook.com"
  //                   ? "admin"
  //                   : "user", // Determine role based on sender
  //               sentAt: new Date()
  //             });

  //             await existingTicket.save();
  //           }

  //           continue; // Skip processing this notification further
  //         }

  //         // Create a new ticket if no existing ticket or conversation is found
  //         console.log(
  //           `Creating a new ticket for conversationId: ${conversationId}`
  //         );

  //         const newTicket = new TicketModel({
  //           userId: tokenRecord._id,
  //           conversationId: conversationId,
  //           emailId: emailId,
  //           senderName,
  //           senderEmail,
  //           queryDetails: emailData.subject || "No Subject",
  //           // body: emailData.body.content || "No content",
  //           body: { content: emailData.body.content || "Body is Empty" },
  //           comments: [], // Initialize with no comments
  //           priority: "Medium",
  //           // assignedTo: "Unassigned",
  //           status: "Open"
  //         });

  //         await newTicket.save();
  //         // // **Send Confirmation Email & Update DB**
  //         const mailSent = await MicrosoftOutlookService.sendConfirmationEmail(
  //           accessToken.access_token,
  //           senderEmail,
  //           newTicket.ticketId
  //         );

  //         console.log("mailSent are `````````````````````````", mailSent);
  //         if (mailSent.success) {
  //           // Update responseMail status in DB
  //           await TicketModel.updateOne(
  //             { _id: newTicket._id },
  //             { responseMail: mailSent.success }
  //           );
  //         } else {
  //           console.log("mail not sent please check code again");
  //           return { success: false, message: "Email not sent" };
  //           // continue;
  //         }
  //       } catch (notificationError) {
  //         console.error(
  //           `Error processing notification for emailId: ${notification.resource
  //             .split("/")
  //             .pop()}`,
  //           notificationError
  //         );
  //         return res.status(400).json({
  //           success: false,
  //           message: "Duplicate commentId detected or other error occurred",
  //           error: notificationError.message
  //         });
  //       }
  //     }

  //     return res.status(202).send("Notifications processed.");
  //   } catch (error) {
  //     console.error("Error processing webhook:", error);
  //     return res.status(500).send("Internal Server Error");
  //   }
  // };

  getallTickets = async (req, res) => {
    try {
      const tickets = await TicketModel.find({});
      // Convert Buffer to Base64
      const attachments = tickets.attachments.map((file) => ({
        filename: file.filename,
        fileType: file.fileType,
        base64: file.data.toString("base64")
      }));
      return res.status(200).json({ tickets, attachments });
    } catch (error) {
      console.error("Error fetching tickets:", error.message);
      res.status(500).send("Error fetching tickets.");
    }
  };
}

// Run every 6 days to renew subscriptions
cron.schedule("0 0 */6 * *", async () => {
  // // Runs every 5 minutes for testing
  console.log("🔄 Running cron job to renew subscriptions (Every 5 mins)...");

  try {
    const users = await TokenModel.find(); // Fetch all users from DB

    for (const user of users) {
      const { user_id, refresh_token } = user;

      if (!refresh_token) {
        console.log(`⚠️ Skipping user ${user_id} (no refresh token)`);
        continue;
      }

      try {
        const value = new EmailControllers();

        const newAccessToken = await value.getAccessToken(refresh_token); // Refresh token logic
        const response = await MicrosoftOutlookService.automaticSubscription(
          user_id,
          newAccessToken.access_token,
          false,
          true
        );

        if (response.data.clientState === user_id) {
          console.log(`✅ Subscription renewed for user ${user_id}`);
        } else {
          console.log(
            `❌ Failed to renew for user ${user_id}:`,
            response.message
          );
        }
      } catch (error) {
        console.error(`🚨 Error processing user ${user_id}:`, error.message);
      }
    }
  } catch (error) {
    console.error("🚨 Error fetching users:", error.message);
  }
});

// Renew subscription
export async function renewSubscription(subscriptionId) {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.patch(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      {
        expirationDateTime: new Date(Date.now() + 3600000).toISOString()
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Subscription renewed:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error renewing subscription:", error.response.data);
    throw error;
  }
}

// Function to delete an existing subscription
const deleteSubscription = async (subscriptionId, accessToken) => {
  try {
    const response = await axios.delete(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    console.log("Subscription deleted successfully:", response.data);
  } catch (error) {
    console.error(
      "Error deleting subscription:",
      error.response?.data || error.message
    );
  }
};
export default new EmailControllers();
