const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
    task:{
        type: String,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    pointsValue:{
        type:Number,
        default:3
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

module.exports = mongoose.model('Todo',todoSchema);