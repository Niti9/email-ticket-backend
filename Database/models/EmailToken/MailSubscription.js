import { Schema, model } from "mongoose";

const emailSubscriptionSchema = new Schema({
  mailBody: {
    type: Object
  }
});

export default EmailSubscription = model(
  "EmailSubscription",
  emailSubscriptionSchema
);
