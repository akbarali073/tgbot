import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  profilePhoto: { type: String },
  name: {
    type: String,
    default: null,
  },
  gender: { type: String, enum: ["male", "female", null], default: null },
  chatCount: { type: Number, default: 0 },
  age: {
    type: Number,
    default: null,
  },
});

const User = mongoose.model("User", userSchema);

export default User;
