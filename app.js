import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: ["http://localhost:5173"],
      credentials: true
    })
  );
}

// await databaseService.connectAllDataBases();
import "./db/connection.js";
import { EmailRoutes } from "./API/Routes/emailRoutes.js";
import emailController from "./API/Controllers/emailController.js";
import TicketModel from "./Database/models/EmailToken/ticketSchema.js";
import { TokenModel } from "./Database/models/EmailToken/emailTokenSchema.js";
import axios from "axios";
// import NotificationModel from "./Database/models/EmailToken/notificationSchema.js";

app.use("/", EmailRoutes);

app.get("/", (req, res) => {
  res.send("hi this is working perfectly fine and port is");
  console.log("port is", process.env.PORT);
  console.log("REdirect uri is", process.env.REDIRECT_URI);
});

// app.post("/webhook", async (req, res) => {
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
//       const accessToken = await emailController.getAccessToken(
//         tokenRecord.refresh_token
//       ); // Get your OAuth token
//       const emailId = notification.resource.split("/").pop(); // Extract email ID from resource

//       // Check if the ticket already exists
//       const existingTicket = await TicketModel.findOne({ ticketId: emailId });
//       if (existingTicket) {
//         console.log(`Duplicate ticket detected for emailId: ${emailId}`);
//         continue; // Skip processing this notification
//       }
//       const emailResponse = await axios.get(
//         `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken.access_token}`
//           }
//         }
//       );

//       const emailData = emailResponse.data;

//       // Create ticket
//       const ticket = new TicketModel({
//         ticketId: `TCKT${Date.now()}`,
//         senderName: emailData.sender.emailAddress.name || "Unknown Sender",
//         senderEmail: emailData.sender.emailAddress.address,
//         queryDetails: emailData.subject || "No Subject",
//         priority: "Medium", // You can enhance this logic
//         assignedTo: "Unassigned",
//         status: "Open"
//       });

//       await ticket.save(); // Save ticket to the database
//     }

//     return res.status(202).send("Notifications processed.");
//   } catch (error) {
//     console.error("Error processing webhook:", error);
//     return res.status(500).send("Internal Server Error");
//   }
// });

EmailRoutes.post("/api/ticket/tickets/webhook", emailController.webhook);
EmailRoutes.get("/api/ticket/tickets", emailController.getallTickets);
EmailRoutes.put("/api/ticket/tickets/:id", emailController.EditTicket);
EmailRoutes.put("/api/ticket/tickets/:id", emailController.EditTicket);
EmailRoutes.post("api/ticket/testing", emailController.testing);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
