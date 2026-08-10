import mongoose from "mongoose";

const kanalSchema = new mongoose.Schema({
  url: { type: String },
  imgurl: { type: String },
  turi: { type: String },

  views: { type: Number, default: 0 },
  hajmi: { type: Number, default: 0 },
  minutes: { type: String, default: "00:00" },
});

const Kanal = mongoose.model("Kanal", kanalSchema);

export default Kanal;
