const mongoose = require("mongoose");

const ModuleSchema = new mongoose.Schema({
    device_id: { type: String, required: true, unique: true },
    name: { type: String, required: true, default: "Clear Zone Module" },
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: false,
        unique: false,
        default: null
    },
    registration_date: { type: Date, required: false, default: Date.now },
});

module.exports = mongoose.model("modules", ModuleSchema);