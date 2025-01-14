import emailController from "../Controllers/emailController.js";
import express from "express";
const EmailRoutes = express.Router();
EmailRoutes.get("/integration/outlookcallback", emailController.getEmailCode);
EmailRoutes.get("/integration/consent", emailController.handleConsent);
//   {
//     api: "/storeRefreshToken",
//     method: "post",
//     inputValidationRequired: true,
//     // validationMethod: AccountsController.validate("CreateUser"),
//     controllerMethod: emailController.createAccount,
//     openApi: false,
//     // rolesAllowed: ["Admin"],
//     rolesAllowed: "*"
//   }

export { EmailRoutes };
