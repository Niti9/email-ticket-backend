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
app.use("/", EmailRoutes);

app.get("/", (req, res) => {
  res.send("hi this is working perfectly fine and port is", PORT);
});
// Verify subscription validation token
app.post("/webhook", (req, res) => {
  if (req.query.validationToken) {
    // Respond with validation token for Microsoft Graph validation
    return res.status(200).send(req.query.validationToken);
  }

  // Process incoming notifications
  const notifications = req.body.value;
  notifications.forEach((notification) => {
    console.log(
      "New email notification::::::::::::::::::::::::::::::::::::::::;",
      notification
    );
    // Fetch email details and store in DB
  });

  res.status(202).send();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
