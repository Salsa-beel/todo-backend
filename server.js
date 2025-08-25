const express = require('express');
const mongoose = require('mongoose');
const bcrypt= require('bcryptjs');
const jwt = require('jsonwebtoken');

// creating the server 
const app = express();
const PORT =  3000;
const JWT_SECRET = 'your_secret_jwt_key'; 


// middleware to understand the json bodies in the requests thats coming to the server

app.use(express.json());
const cors = require('cors');
app.use(cors());


const MONGODB_URI = 'mongodb://localhost:27017/todos';

// schema
const UserSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    points:{
        type:String,
        default:0
    },
    level:{
        type:String,
        default:0
    }
})

const TodoSchema = new mongoose.Schema({
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

const User = mongoose.model('User', UserSchema)
const Todo = mongoose.model('Todo', TodoSchema);

// JWT middleware 

const auth = (req,res, next)=>{
    try {
        const token = req.header('Authorization').replace('Bearer', '');
        console.log(token);
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(decoded)
        req.user = decoded;
         next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate.' });
    }

}
// Auth ENDPOINTS //

app.post('/register', async (req,res)=>{
    try{
        const {username , email, password }=req.body;
        const hashedPass = await bcrypt.hash(password,8);
        const newUser = new User({username,email, password:hashedPass , points:0, level:1});
        await newUser.save();
        res.status(200).json({message:'user registered successfully'})
    }  catch (error) {
        res.status(400).json({ error: 'Username already exists or failed to register.' });
    }
})



app.post('/login',async(req,res)=>{

    try{

        const {username,password}=req.body;
        const user =await User.findOne({username});
        console.log(user)
        if (!user){
             return res.status(400).json({ error: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password,user.password);
            if (!isMatch) {
                        return res.status(400).json({ error: 'Invalid credentials.' });
                    }
                    const token = jwt.sign({id:user._id.toString()}, JWT_SECRET);
                      res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Failed to log in.' });
    } 
})


// API ENDPOINTS //

app.post('/todos',auth, async(req,  res) => {

try {
    const {task} = req.body;
    console.log('taskk',  {task} )
    const newTodo = new Todo({
        task,
        user:req.user.id
    });
    const savedTodo = await newTodo.save();
    res.status(201).json(savedTodo);

} catch (error) {
    res.status(500).json({error: 'Failed to create todo'});
}

})


app.get('/todos', auth, async (req, res)=>{

    try {
        const allToDos = await Todo.find({ user: req.user.id });
        const formattedTodos = allToDos.map( toDoItem => ({
              id:toDoItem._id,
              task: toDoItem.task,
              completed: toDoItem.completed,
              pointsValue: toDoItem.pointsValue,
              createdAt: toDoItem.createdAt

        }))
        res.status(200).json(formattedTodos);
    }catch(err){
        res.status(401).json({error:err.message})
    }
});


app.get('/user', auth, async (req, res)=>{

    try {
        const allUserData = await User.findById({ user:req.user.id });
        const formattedUserData = allUserData.map( userItem => ({
              id:userItem._id,
              level: userItem.level,
              points: userItem.points,
        }))
        res.status(200).json(formattedUserData);
    }catch(err){
        res.status(401).json({error:err.message})
    }
});


app.put('/todos/:id', auth, async(req, res) => {

    try{
        const {id} = req.params;
        const {task} = req.body;
        const updatedToDo = await Todo.findOneAndUpdate(  { _id: id, user: req.user.id }, {task}, {new:true});
  // If no todo was found with that ID, send a 404 status.
    if (!updatedToDo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
        res.status(200).json(updatedToDo);
    } catch(err){
        res.status(404).json({err:err.message})
    }

})

app.put('/todos/:id/complete' , auth, async(req, res) => {

    try{
        const {id} = req.params;
        const completedToDo = await Todo.findOneAndUpdate(
            {_id:id , user:req.user.id},
            {completed:true},
            {new:true}
        );  
        console.log('completedToDo', completedToDo)

        if(!completedToDo){
             console.log('completedToDo', completedToDo)
            return res.status(404).json({error:'Todo not found'})
        }


        const now = new Date();
        const createdAt = completedToDo.createdAt;
        console.log('createdAt', createdAt)
        const hoursPassed = (now - createdAt) / (1000*60*60 ); // Convert milliseconds to hours
        let pointsEarned = completedToDo.pointsValue;
        const pointsToSubtract = Math.floor(hoursPassed / 3);
        pointsEarned = Math.max(0,pointsEarned - pointsToSubtract)
        console.log(`Task completed. Initial points: ${completedToDo.pointsValue}. Hours passed: ${hoursPassed.toFixed(2)}. Points subtracted: ${pointsToSubtract}. Points earned: ${pointsEarned}.`);



const user = await User.findById(req.user.id);
if(user){
    const newPoints = user.points +pointsEarned;
    let newLevel = user.level;
        if(newPoints >= newLevel * 100){
            newLevel ++;
            console.log(`User ${user.username} leveled up to Level ${newLevel}!`);
        }
        await User.findByIdAndUpdate(req.user.id , {
            $set:{
                points:newPoints,
                level:newLevel
            }
        })
}


    } catch (err) {
    res.status(500).json({ error: err.message });
  }


} );


app.delete('/todos/:id' ,auth, async(req , res)=>{

    try {
        const {id}= req.params;
        const deletedToDo = await Todo.findOneAndDelete({ _id: id, user: req.user.id });
        if(!deletedToDo){
            return res.status(404).json({error:'Todo not found'})
        }
        res.status(204).send();
    } catch (err){
            res.status(500).json({ error: err.message });
    }
})


// connection 
mongoose.connect(MONGODB_URI).then(()=>{

    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(()=>{
    console.error('Error connecting to MongoDB');
})

