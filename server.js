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
    password:{
        type:String,
        required:true
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
// API ENDPOINTS //

app.post('/register', async (req,res)=>{
    try{
        const {username , password}=req.body;
        const hashedPass = await bcrypt.hash(password,8);
        const newUser = new User({username,password:hashedPass})
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



app.post('/todos',auth, async(req, res) => {

try {
    const {task} = req.body;
    const newTodo = new Todo({task});
    const savedTodo = await newTodo.save();
    res.status(201).json(savedTodo);

} catch (error) {
    res.status(500).json({error: 'Failed to create todo'});
}

})


app.get('/todos', auth, async (req, res)=>{

    try {
        const allToDos = await Todo.find();
        const formattedTodos = allToDos.map( toDoItem => ({
            id:toDoItem._id,
              task: toDoItem.task,
      completed: toDoItem.completed

        }))
        res.status(200).json(formattedTodos);
    }catch(err){
        res.status(401).json({error:err.message})
    }
});

app.put('/todos/:id', auth, async(req, res) => {

    try{
        const {id} = req.params;
        const {task , completed} = req.body;
        const updatedToDo = await Todo.findByIdAndUpdate(id, {task, completed}, {new:true});
  // If no todo was found with that ID, send a 404 status.
    if (!updatedToDo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
        res.status(200).json(updatedToDo);
    } catch(err){
        res.status(404).json({err:err.message})
    }

})

app.delete('/todos/:id' , async(req , res)=>{

    try {
        const {id}= req.params;
        const deletedToDo = await Todo.findByIdAndDelete(id);
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

