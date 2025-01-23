import axios from "axios";
import { TokenModel } from "../../Database/models/EmailToken/emailTokenSchema.js";
import TicketModel from "../../Database/models/EmailToken/ticketSchema.js";

class EmailControllers {
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
      const redirectUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}&scope=Mail.Read offline_access&state=${userId}&prompt=consent`;
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
      const tokenResponse = await this.getRefreshToken(code);

      // Save the refresh token in the database
      await TokenModel.updateOne(
        { user_id: userId },
        { refresh_token: tokenResponse.refresh_token },
        { upsert: true }
      );

      const subscription = await this.automaticSubscription(
        userId,
        tokenResponse.access_token
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
            scope: "Mail.Read offline_access"
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
            scope: "Mail.read"
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
            expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
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
  //       // Extract email details

  //       const userId = notification.clientState; // Assume user_id is sent from the frontend
  //       const tokenRecord = await TokenModel.findOne({ user_id: userId });
  //       console.log("this is token Record data ", tokenRecord);
  //       const accessToken = await this.getAccessToken(
  //         tokenRecord.refresh_token
  //       ); // Get your OAuth token
  //       const emailId = notification.resource.split("/").pop(); // Extract email ID from resource

  //       const emailResponse = await axios.get(
  //         `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${accessToken.access_token}`
  //           }
  //         }
  //       );

  //       const emailData = emailResponse.data;
  //       const conversationId = emailData.conversationId; // Extract conversationId from the email data

  //       const existingTicket = await TicketModel.findOne({
  //         $or: [
  //           { emailId: emailId }, // Check if the email ID is already present
  //           { queryDetails: emailData.subject } // Check if the subject matches (or content in your case)
  //         ]
  //       });

  //       // Check if the conversation already exists in the database
  //       const sameConversationId = await TicketModel.findOne({
  //         conversationId
  //       });

  //       if (existingTicket) {
  //         console.log(`Duplicate ticket detected for emailId: ${emailId}`);
  //         continue; // Skip processing this notification
  //       }

  //       if (sameConversationId) {
  //         // If the conversation already exists, update the comments array
  //         console.log(
  //           `Adding a reply to the existing conversation for conversationId: ${conversationId}`
  //         );

  //         sameConversationId.comments.push({
  //           senderName: emailData.sender.emailAddress.name || "Unknown Sender",
  //           senderEmail: emailData.sender.emailAddress.address,
  //           content: emailData.body.content || "No content", // Reply content
  //           role:
  //             emailData.sender.emailAddress.address ===
  //             "nitinnoyt829@outlook.com"
  //               ? "admin"
  //               : "user", // Determine role based on sender
  //           sentAt: new Date()
  //         });

  //         await sameConversationId.save();
  //       } else {
  //         // If this is the first email in the conversation, create a new ticket
  //         console.log(
  //           `Creating a new ticket for conversationId: ${conversationId}`
  //         );

  //         const ticket = new TicketModel({
  //           conversationId: conversationId,
  //           ticketId: emailId,
  //           senderName: emailData.sender.emailAddress.name || "Unknown Sender",
  //           senderEmail: emailData.sender.emailAddress.address,
  //           queryDetails: emailData.subject || "No Subject",
  //           body: emailData.body.content || "No content",
  //           comments: [], // Initialize with no comments
  //           priority: "Medium",
  //           assignedTo: "Unassigned",
  //           status: "Open"
  //         });

  //         await ticket.save();
  //       }
  //     }
  //     //   // Create ticket
  //     //   const ticket = new TicketModel({
  //     //     ticketId: emailId,
  //     //     senderName: emailData.sender.emailAddress.name || "Unknown Sender",
  //     //     senderEmail: emailData.sender.emailAddress.address,
  //     //     queryDetails: emailData.subject || "No Subject",
  //     //     bodyPreview: emailData.bodyPreview,
  //     //     // body: emailData.body.content || "Body is Empty",
  //     //     body: { content: emailData.body.content || "Body is Empty" },
  //     //     priority: "Medium", // You can enhance this logic
  //     //     assignedTo: "Unassigned",
  //     //     status: "Open"
  //     //   });

  //     //   await ticket.save(); // Save ticket to the database
  //     // }

  //     return res.status(202).send("Notifications processed.");
  //   } catch (error) {
  //     console.error("Error processing webhook:", error);
  //     return res.status(500).send("Internal Server Error");
  //   }
  // };

  webhook = async (req, res) => {
    try {
      // Handle validation token
      if (req.query.validationToken) {
        console.log("Validation Token Received:", req.query.validationToken);
        return res.status(200).send(req.query.validationToken);
      }

      // Log the received notification
      console.log("Notification Received:", req.body);

      const notifications = req.body.value;
      if (!notifications || notifications.length === 0) {
        console.log("No notifications received.");
        return res.status(204).send("No notifications received.");
      }

      for (const notification of notifications) {
        try {
          // Extract email details
          const userId = notification.clientState; // Assume user_id is sent from the frontend
          const tokenRecord = await TokenModel.findOne({ user_id: userId });

          if (!tokenRecord) {
            console.warn(`No token record found for user_id: ${userId}`);
            continue; // Skip this notification if no token is found
          }

          const accessToken = await this.getAccessToken(
            tokenRecord.refresh_token
          ); // Get your OAuth token
          const emailId = notification.resource.split("/").pop(); // Extract email ID from resource

          // Fetch email details from Microsoft Graph API
          const emailResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken.access_token}`
              }
            }
          );

          const emailData = emailResponse.data;
          const conversationId = emailData.conversationId; // Extract conversationId from the email data

          // Check for duplicate tickets by `emailId` or `conversationId`
          const existingTicket = await TicketModel.findOne({
            $or: [{ emailId }, { conversationId }]
          });

          if (existingTicket) {
            console.log(
              `Duplicate ticket detected for emailId: ${emailId} or conversationId: ${conversationId}`
            );

            // If conversation exists, update comments
            if (existingTicket.conversationId === conversationId) {
              console.log(
                `Adding a reply to the existing conversation for conversationId: ${conversationId}`
              );

              // Check if the comment already exists based on `emailId`
              const isDuplicateComment = existingTicket.comments.some(
                (comment) => comment.commentId === emailId
              );

              if (isDuplicateComment) {
                console.log(
                  `Duplicate comment detected id==> ${conversationId}`
                );
                continue; // Skip adding this duplicate comment
              }

              existingTicket.comments.push({
                commentId: emailData.id,
                senderName:
                  emailData.sender.emailAddress.name || "Unknown Sender",
                senderEmail: emailData.sender.emailAddress.address,
                content: emailData.body.content || "No content", // Reply content
                role:
                  emailData.sender.emailAddress.address ===
                  "nitinnoyt829@outlook.com"
                    ? "admin"
                    : "user", // Determine role based on sender
                sentAt: new Date()
              });

              await existingTicket.save();
            }

            continue; // Skip processing this notification further
          }

          // Create a new ticket if no existing ticket or conversation is found
          console.log(
            `Creating a new ticket for conversationId: ${conversationId}`
          );

          const newTicket = new TicketModel({
            conversationId: conversationId,
            ticketId: emailId,
            senderName: emailData.sender.emailAddress.name || "Unknown Sender",
            senderEmail: emailData.sender.emailAddress.address,
            queryDetails: emailData.subject || "No Subject",
            // body: emailData.body.content || "No content",
            body: { content: emailData.body.content || "Body is Empty" },
            comments: [], // Initialize with no comments
            priority: "Medium",
            assignedTo: "Unassigned",
            status: "Open"
          });

          await newTicket.save();
        } catch (notificationError) {
          console.error(
            `Error processing notification for emailId: ${notification.resource
              .split("/")
              .pop()}`,
            notificationError
          );
        }
      }

      return res.status(202).send("Notifications processed.");
    } catch (error) {
      console.error("Error processing webhook:", error);
      return res.status(500).send("Internal Server Error");
    }
  };

  getallTickets = async (req, res) => {
    try {
      const tickets = await TicketModel.find({});
      return res.status(200).json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error.message);
      res.status(500).send("Error fetching tickets.");
    }
  };
}

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
