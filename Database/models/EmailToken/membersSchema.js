import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  createdAt: { type: Date, default: Date.now }
});
const MemberModal = mongoose.model("Member", memberSchema);
export default MemberModal;
