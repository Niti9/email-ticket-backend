import mongoose from "mongoose";

const TokenSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  refresh_token: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  user_outlook_email: { type: String, unique: true }
});

export const TokenModel = mongoose.model("EmailToken", TokenSchema);
