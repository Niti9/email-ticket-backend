// import { TokenModel } from "../Database/models/EmailToken/emailTokenSchema.js";
// import OutlookRepo from "../Database/repository/OutlookRepo.js";

class MicrosoftOutlookServices {
  sendConfirmationEmail = async (accessToken, userEmail, ticketId) => {
    try {
      // Get Admin Email Dynamically
      const adminResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!adminResponse.ok) {
        throw new Error(
          `Failed to fetch admin email: ${adminResponse.statusText}`
        );
      }

      const adminData = await adminResponse.json();
      const adminEmail = adminData.mail || adminData.userPrincipalName;
      console.log("admin mail is adminEmail", adminEmail);

      if (!adminEmail) {
        console.log("No admin email found");
        return { success: false, message: "No admin email found" };
      }

      // Email Body
      const emailBody = {
        message: {
          subject: `Your Ticket is Raised - Ticket ID: ${ticketId}`,
          body: {
            contentType: "Text",
            content: `We have received your request. Your Ticket ID is '${ticketId}'. We will resolve your issue as soon as possible.`
          },
          toRecipients: [{ emailAddress: { address: userEmail } }],
          ccRecipients: [{ emailAddress: { address: adminEmail } }]
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
}
export default new MicrosoftOutlookServices();
