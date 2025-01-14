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
import { EmailSubscriptionData } from "./Database/models/EmailToken/MailSubscription.js";
app.use("/", EmailRoutes);

app.get("/", (req, res) => {
  res.send("hi this is working perfectly fine and port is");
  console.log("port is", process.env.PORT);
  console.log("REdirect uri is", process.env.REDIRECT_URI);
});

// // Verify subscription validation token
// app.post("/webhook", (req, res) => {
//   console.log("ye to chal gaya", req.query);
//   if (req.query.validationToken) {
//     // Respond with validation token for Microsoft Graph validation
//     return res.status(200).send(req.query.validationToken);
//   }

//   // Process incoming notifications
//   const notifications = req.body.value;
//   notifications.forEach((notification) => {
//     console.log(
//       "New email notification::::::::::::::::::::::::::::::::::::::::;",
//       notification
//     );
//     // Fetch email details and store in DB
//   });
//   return res.status(202).send("Notification received and processed.");

//   // res.status(202).send();
// });

app.post("/webhook", (req, res) => {
  console.log("ye to chal gaya", req.query);
  try {
    // if (req.query.validationToken) {
    //   // Respond with validation token for Microsoft Graph validation
    //   return res.status(200).send(req.query.validationToken);
    // }

    // Process incoming notifications
    console.log(
      "it should work as well ``````````````````````````````````````",
      req.query.validationToken
    );
    const notifications = req.body.value;
    notifications.forEach((notification) => {
      console.log(
        "New email notification::::::::::::::::::::::::::::::::::::::::;",
        notification
      );
      // Fetch email details and store in DB
    });
    return res.status(202).send("Notification received and processed.");
  } catch (error) {
    console.log("error is ", error);
  }

  // res.status(202).send();
});

// // Webhook verification
// app.get("/webhook", (req, res) => {
//   const { validationToken } = req.query;
//   console.log("validation token is ", validationToken);
//   if (validationToken) {
//     console.log("hi hello namaste ");

//     return res.status(200).send(validationToken);
//   }
//   return res.status(200).send("hello ");
//   // return res.status(400).send("Validation token missing.");
// });

// app.post("/webhook", async (req, res) => {
//   console.log("Received webhook notification:", req.body); // Log the incoming webhook data

//   // // Check for the clientState in the webhook to validate the notification
//   // const clientState = req.body.clientState;
//   // if (clientState !== "yourClientState") {
//   //   console.log("Client state does not match. Ignoring notification.");
//   //   return res.status(400).send("Invalid client state");
//   // }

//   // // Log the resource data (new email details, for example)
//   // console.log("Resource URL:", req.body.value[0].resource);

//   // // You can fetch the email details using the resource URL (example)
//   // const resourceUrl = req.body.value[0].resource;
//   // console.log("Fetching email details from:", resourceUrl);
//   // // (Fetch the email details with an API call to Microsoft Graph)

//   if (req.body) {
//     const data = await EmailSubscriptionData.save(req.body);
//     console.log("data is data", data);
//     res.status(201).send("Notification processed successfully");
//   } else {
//     res.status(200).send("Notification processed successfully");
//   }
// });

// // Webhook validation
// app.all("/webhook", (req, res) => {
//   const validationToken = req.query.validationToken;
//   if (validationToken) {
//     console.log("Validation token received: ", validationToken);
//     // Respond with the validation token
//     return res.status(200).send(validationToken);
//   }

//   // Handle webhook notifications (for POST requests)
//   if (req.method === "POST") {
//     console.log("Received webhook notification:", req.body);

//     // Process incoming notifications
//     const notifications = req.body.value || [];
//     notifications.forEach((notification) => {
//       console.log("New email notification:", notification);
//       // Process the notification and fetch email details
//     });

//     return res.status(202).send("Notification received and processed.");
//   }

//   return res.status(400).send("Invalid request.");
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
