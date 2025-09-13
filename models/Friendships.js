const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    friend:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    status:{
        type:String,
        enum:['pending','accepted','rejected'],
        default:'pending'
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

module.exports = mongoose.model('Friendship',friendshipSchema);