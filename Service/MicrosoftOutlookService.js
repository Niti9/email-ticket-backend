// import { TokenModel } from "../Database/models/EmailToken/emailTokenSchema.js";
// import OutlookRepo from "../Database/repository/OutlookRepo.js";

class MicrosoftOutlookServices {
  sendConfirmationEmail = async (accessToken, userEmail, ticketId) => {
    try {
      // Get Admin Email Dynamically
      const adminResponse = await axios.get(
        "https://graph.microsoft.com/v1.0/me",
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const adminEmail =
        adminResponse.data.mail || adminResponse.data.userPrincipalName;
      if (!adminEmail) {
        console.log("not admin email found");
      }
      const emailBody = {
        message: {
          subject: `Your Ticket is Raised - Ticket ID: ${ticketId}`,
          body: {
            contentType: "Text",
            content: `We have received your request. Your Ticket ID is '${ticketId}'. We will resolve your issue as soon as possible.`
          },
          toRecipients: [
            {
              emailAddress: { address: userEmail }
            }
          ],
          ccRecipients: [
            {
              emailAddress: { address: adminEmail }
            }
          ]
        },
        saveToSentItems: "true"
      };

      const response = await axios.post(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        emailBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      console.log(`Confirmation email sent to ${userEmail}:`, response.status);
      return response.status === 202;
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      return false;
    }
  };
}
export default new MicrosoftOutlookServices();
