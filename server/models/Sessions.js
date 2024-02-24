const mongoose = require("mongoose")

const TokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    }
})

const SessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctors',
        required: true
    },
    deviceId: {
        type: String,
        required: true
    },
    accessTokens: [TokenSchema]
}, { timestamps: true })

module.exports = mongoose.model("Session", SessionSchema)