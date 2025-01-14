// import axios from "axios";
// class EmailControllers {
//   getEmailCode = async (req, res) => {
//     try {
//       // Extract the 'code' and 'state' from query parameters
//       const code = req.query.code;
//       const state = req.query.state;
//       console.log("this is request query ", req.query);

//       if (!code) {
//         return res
//           .status(400)
//           .send("Authorization code not found in the callback URL");
//       }

//       // Respond back or proceed to the next step (e.g., exchange the code for a token)
//       //   res.send(`Code received: ${code}`);
//       res.send(`Code received: ${req.query}`);

//       const tokenResponse = await this.getRefreshToken(code);
//       console.log("Token Response:", tokenResponse);

//       //   if (tokenResponse.refresh_token) {
//       if (tokenResponse.refresh_token) {
//         const accessToken = await this.getAccessToken(
//           tokenResponse.refresh_token
//         );
//         console.log("Access Token Response:", accessToken);
//       } else {
//         console.log("No refresh token found in the response.");
//       }
//     } catch (error) {
//       console.error("Error in getEmailCode:", error.message);
//       res.status(500).send("An error occurred while processing your request.");
//     }
//   };

//   getRefreshToken = async (code) => {
//     if (!code) {
//       return res.status(400).send(" code is missing");
//     }

//     try {
//       const response = await axios.post(
//         "https://login.microsoftonline.com/common/oauth2/v2.0/token",
//         new URLSearchParams({
//           client_id: process.env.CLIENT_ID,
//           client_secret: process.env.CLIENT_SECRET,
//           redirect_uri: process.env.REDIRECT_URI,
//           code: code,
//           grant_type: "authorization_code",
//           scope: "Mail.Read offline_access"
//         }).toString(),
//         {
//           headers: { "Content-Type": "application/x-www-form-urlencoded" }
//         }
//       );

//       return response.data;
//     } catch (error) {
//       console.error(
//         "Error exchanging code for token:",
//         error.response?.data || error.message
//       );
//     }
//   };
//   getAccessToken = async (value) => {
//     if (!value) {
//       return res.status(400).send(" response is missing");
//     }

//     try {
//       const response = await axios.post(
//         "https://login.microsoftonline.com/common/oauth2/v2.0/token",
//         new URLSearchParams({
//           client_id: process.env.CLIENT_ID,
//           client_secret: process.env.CLIENT_SECRET,
//           redirect_uri: process.env.REDIRECT_URI,
//           refresh_token: value,
//           grant_type: "refresh_token",
//           scope: "Mail.Read"
//         }).toString(),
//         {
//           headers: { "Content-Type": "application/x-www-form-urlencoded" }
//         }
//       );

//       // Handle the token response
//       return response.data;
//     } catch (error) {
//       console.error(
//         "Error exchanging code for token:",
//         error.response?.data || error.message
//       );
//     }
//   };
// }
// export default new EmailControllers();

import axios from "axios";
import { TokenModel } from "../../Database/models/EmailToken/emailTokenSchema.js";

class EmailControllers {
  // Method to check if refresh token exists, and if it does, get the access token
  handleConsent = async (req, res) => {
    const userId = req.query.user_id; // Assume user_id is sent from the frontend

    if (!userId) {
      return res.status(400).send("User ID is required.");
    }

    // Check if the refresh token exists in the database for this user
    const tokenRecord = await TokenModel.findOne({ user_id: userId });

    if (tokenRecord) {
      // console.log(
      //   "Refresh token exists. Fetching access token...",
      //   tokenRecord
      // );
      try {
        const accessToken = await this.getAccessToken(
          tokenRecord.refresh_token
        );
        try {
          const response = await axios.get(
            "https://graph.microsoft.com/v1.0/me/messages",
            {
              headers: {
                Authorization: `Bearer ${accessToken.access_token}`
              }
            }
          );
          // console.log(response.data);
        } catch (error) {
          console.error("API Error:", error.response?.data || error.message);
        }
        return res.status(200).send({
          access_token: accessToken.access_token,
          expires_in: accessToken.expires_in
        });
      } catch (error) {
        console.error("Failed to fetch access token:", error);
        return res.status(500).send("Failed to fetch access token.");
      }
    } else {
      console.log("No refresh token found. Redirecting to consent page...");
      // Redirect user to consent page for OAuth authorization
      const redirectUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}&scope=Mail.Read offline_access&state=${userId}&prompt=consent`;
      res.status(302).redirect(redirectUrl);
    }
  };

  // Callback to handle the token exchange after consent
  getEmailCode = async (req, res) => {
    try {
      const code = req.query.code;
      const userId = req.query.state; // State contains the user_id

      if (!code || !userId) {
        return res
          .status(400)
          .send("Authorization code or user ID not found in the callback URL.");
      }

      // Exchange the authorization code for refresh token
      const tokenResponse = await this.getRefreshToken(code);

      // Save the refresh token in the database
      await TokenModel.updateOne(
        { user_id: userId },
        { refresh_token: tokenResponse.refresh_token },
        { upsert: true }
      );

      console.log("Tokens saved to database.");
      res.send("Authorization successful. You can now log in.");
    } catch (error) {
      console.error("Error in getEmailCode:", error.message);
      res
        .status(500)
        .send("An error occurred during the authorization process.");
    }
  };

  // Exchange authorization code for a refresh token
  getRefreshToken = async (code) => {
    try {
      const response = await axios.post(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          redirect_uri: process.env.REDIRECT_URI,
          code: code,
          grant_type: "authorization_code",
          scope: "Mail.Read offline_access"
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      console.log("this is refresh token here", response.data);
      return response.data;
    } catch (error) {
      console.error("Error exchanging code for refresh token:", error);
      // console.error("Error exchanging code for refresh token:", error.message);
      throw error;
    }
  };

  // Exchange refresh token for an access token
  getAccessToken = async (refreshToken) => {
    try {
      const response = await axios.post(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          redirect_uri: process.env.REDIRECT_URI,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "Mail.read"
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      console.log(
        "This is acccess Token which we passed to create Subscription ......................",
        response.data.access_token
      );
      createSubscription(response.data.access_token);

      return response.data;
    } catch (error) {
      console.error(
        "Error exchanging refresh token for access token:",
        error.error_description
      );
      throw error;
    }
  };
}

export async function createSubscription(accessToken) {
  try {
    // const accessToken = await getAccessToken();
    // const emailController = new EmailControllers();
    // const accessToken = await emailController.getAccessToken(refreshToken);

    const response = await axios.post(
      "https://graph.microsoft.com/v1.0/subscriptions",
      {
        changeType: "created",
        notificationUrl: "https://your-vercel-project.vercel.app/webhook",
        resource: "me/messages",
        expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        clientState: "yourClientState"
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Subscription created:", response.data);
    console.log("Subscription initialized:", response.data.id);
    // return response.data;
  } catch (error) {
    console.error("Error creating subscription:", error.response.data);
    throw error;
  }
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
export default new EmailControllers();
