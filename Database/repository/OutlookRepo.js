import axios from "axios";
import { TokenModel } from "../models/EmailToken/emailTokenSchema.js";
import TicketModel from "../models/EmailToken/ticketSchema.js";
class OutlookRepository {
  findByUserId = async (userId) => {
    return await TokenModel.findOne({ user_id: userId });
  };

  AddorUpdateUserById = async (userId, token, appusername, email) => {
    // Save the refresh token in the database if user exist then update
    return await TokenModel.updateOne(
      { user_id: userId },
      {
        refresh_token: token,
        userName: appusername,
        user_outlook_email: email
      },
      { upsert: true } //upsert true help if no match found then store new data there
    );
  };

  findUserByEmail = async (email) => {
    const user = await AppUser.findOne({ email })
      .select("_id appusercode appusername designation email passcode")
      .populate({
        path: "appusergroupid",
        select: "_id: appusergroupcode appusergroupname groupshortcut"
      });
    return user;
  };

  findLastUserInGroup = async (userGroupId) => {
    return await AppUser.findOne({ appusergroupid: userGroupId }).sort({
      createdAt: -1
    });
  };

  createUser = async (userData) => {
    const newUser = new AppUser(userData);
    return await newUser.save();
  };
}

export default new OutlookRepository();
