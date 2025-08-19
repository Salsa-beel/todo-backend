const express = require('express');
const mongoose = require('mongoose');

// creating the server 
const app = express();
const PORT =  3000;

// middleware to understand the json bodies in the requests thats coming to the server

app.use(express.json());

const MONGODB_URI = 'mongodb://localhost:27017/todos';

// schema
const TodoSchema = new mongoose.Schema({
    task:{
        type: String,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    }
});

const Todo = mongoose.model('Todo', TodoSchema);
// API ENDPOINTS //

app.post('/todos',async(req, res) => {

try {
    const {task} = req.body;
    const newTodo = new Todo({task});
    const savedTodo = await newTodo.save();
    res.status(201).json(savedTodo);

} catch (error) {
    res.status(500).json({error: 'Failed to create todo'});
}

})


app.get('/todos', async (req, res)=>{

    try {
        const allToDos = await Todo.find();
        res.status(200).json(allToDos);
    }catch(err){
        res.status(401).json({error:err.message})
    }
});

app.put('/todos/:id', async(req, res) => {

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

