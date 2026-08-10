import mongoose from "mongoose";

const clickSchema = new mongoose.Schema({
  clicks: { type: Number, default: 0 },
});

const Click = mongoose.model("Click", clickSchema);
export default Click;
