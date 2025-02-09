import emailController from "../Controllers/emailController.js";
import express from "express";
const EmailRoutes = express.Router();
// EmailRoutes.get("/integration/outlookcallback", emailController.getEmailCode);
EmailRoutes.post("/createoutlooktoken", emailController.getEmailCode);
EmailRoutes.get("/integration/consent", emailController.handleConsent);
// EmailRoutes.post("/testing", emailController.testing);
// EmailRoutes.post("/createSubscription", emailController.createSubscription);

export { EmailRoutes };
