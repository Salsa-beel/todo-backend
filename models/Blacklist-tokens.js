
const mongoose = require('mongoose');

const blacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
 
    createdAt: {
        type: Date,
        default: Date.now,
        index: { expires: '1d' } // Expires in 1 day
    }
});

module.exports = mongoose.model('BlacklistToken', blacklistTokenSchema);