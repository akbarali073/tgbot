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
  city: { type: String, default: null },
  chatCount: { type: Number, default: 0 },
  age: {
    type: Number,
    default: null,
  },
  // 💎 Premium / VIP status
  isPremium: { type: Boolean, default: false },
  premiumExpiresAt: { type: Date, default: null },

  // 🎯 VIP Search preferences
  prefGender: { type: String, default: "any" },
  prefCity: { type: String, default: "all" },
  prefMinAge: { type: Number, default: 18 },
  prefMaxAge: { type: Number, default: 60 },
  selectedAiPartner: { type: String, default: null },
});

userSchema.methods.hasActivePremium = function () {
  if (!this.isPremium) return false;
  if (this.premiumExpiresAt && new Date() > this.premiumExpiresAt) {
    return false;
  }
  return true;
};

const User = mongoose.model("User", userSchema);

export default User;
