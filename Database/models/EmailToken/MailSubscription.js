import mongoose from "mongoose";

const emailSubscriptionSchema = new mongoose.Schema({
  mailBody: {
    type: Object
  }
});

export const EmailSubscriptionData = mongoose.model(
  "EmailSubscription",
  emailSubscriptionSchema
);
