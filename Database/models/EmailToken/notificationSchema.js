import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  subscriptionId: { type: String, required: true },
  resource: { type: String, required: true },
  changeType: { type: String, required: true },
  clientState: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const NotificationModel = mongoose.model("Notification", notificationSchema);
export default NotificationModel;
