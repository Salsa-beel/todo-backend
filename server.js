
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
// middleware 
const { auth } = require('./middleware/authMiddleware');

// routes
const todoRoutes = require('./routes/todos');
const app = express();
// creating the server 
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_jwt_key';


// middleware to understand the json bodies in the requests thats coming to the server

app.use(express.json());
app.use(cors());
app.use( todoRoutes);

// import models
const bcrypt= require('bcryptjs');
const jwt = require('jsonwebtoken');

const user = require('./models/User');
const todo = require('./models/Todo');
const friendship= require('./models/Friendships');
const blacklistToken = require('./models/Blacklist-tokens');





const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todos';

// Auth ENDPOINTS //

app.post('/register', async (req,res)=>{
    try{
        const {username , email, password }=req.body;
        const hashedPass = await bcrypt.hash(password,8);
        const newUser = new user({username,email, password:hashedPass , points:0, level:1});
        await newUser.save();
        res.status(200).json({message:'user registered successfully'})
    }  catch (error) {
        res.status(400).json({ error: 'Username already exists or failed to register.' });
    }
})

app.post('/login',async(req,res)=>{

    try{

        const {username,password}=req.body;
        const user =await user.findOne({username});
        console.log(user)
        if (!user){
             return res.status(400).json({ error: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password,user.password);
            if (!isMatch) {
                        return res.status(400).json({ error: 'Invalid credentials.' });
                    }
                    const token = jwt.sign({id:user._id.toString()}, JWT_SECRET);
                      res.status(200).json(
            {
            token,
            userId: user._id, 
            username: user.username  });
    } catch (error) {
        res.status(500).json({ error: 'Failed to log in.' });
    } 
})

app.post('/logout', auth, async (req, res) => {

    try{
         const token = req.header('Authorization').replace('Bearer ', '');
         const blacklistedToken = new BlacklistToken({ token });
         await blacklistedToken.save();
         res.status(200).json({ message: 'Logged out successfully' });

    }catch (error) {
        res.status(500).json({ error: 'Failed to log out.' });
    
    }
})

// API ENDPOINTS //

app.get('/friends/pendingReq', auth, async (req,res)=>{
try{

    const pendingReq = await friendship.find({friend:req.user.id, status:'pending'}).populate('user','username');
    const formattedResponse = pendingReq.map(reqItem => ({
        friendshipId: reqItem._id,
        username: reqItem.user.username,
        status: reqItem.status,
        createdAt: reqItem.createdAt
    }));

    res.status(200).json(formattedResponse);
}catch(err){
    res.status(500).json({error:'Failed to fetch pending requests'})
}
});

app.get('/friends/getAllFriends', auth, async (req,res)=>{

        try{
            const userId = req.user.id;
            const friends = await friendship.find({
            $or:[
                
                {user:userId, status:'accepted' },
                {friend:userId, status:'accepted' }
             ]   
            
            }).populate('friend user', 'username points level');
            console.log('friends line 200', friends)

        
            const formattedResponse = friends.map(friendItem => {
             
             const isUser = friendItem.user._id.toString() === userId.toString();
            const friendData = isUser ? friendItem.friend : friendItem.user;
             
               return { 
                friendshipId: friendItem._id,
                friendId: friendData._id,
                username: friendData.username,
                level: friendData.level,
                points: friendData.points,
                status: friendItem.status
            
            
            }
            });
                res.status(200).json(formattedResponse);    
                
        }catch(err){
            res.status(500).json({error:'Failed  to fetch friends'})
        }
    });

app.post('/friends/sendReq', auth, async (req,res)=>{

    try{
        const {friendUsername} = req.body;
        const userId = req.user.id;
        const friend =  await user.findOne({username:friendUsername});

        if(!friend){
            res.status(404).json({error:'User not found'})
        }
        if (friend._id.toString() === userId){
            return res.status(400).json({error:'You cannot send a friend request to yourself'})
        }

        const existingFriendReq = await friendship.findOne({
            $or:[
                {user:userId, friend:friend._id},
                {user:friend._id, friend:userId}
            ]
        });
         
        
        if(existingFriendReq){
            res.status(404).json({error:'Friend request already sent or exists.'})
        }

         const newFriendship = new friendship({
            user: userId,
            friend: friend._id,
            status: 'pending'
        });
     await newFriendship.save();
        res.status(201).json({ message: 'Friend request sent successfully.' });
    }catch(err){
        res.status(500).json({error:'Failed to send friend request'})
    }
});


app.put('/friends/respondReq', auth, async (req,res)=>{
    try{

    const {friendReqId, action} = req.body; // things the frontend will send
    
       const userId = req.user.id;  // to know who is logged in
       const friendship =  await friendship.findById(friendReqId);
       console.log('friendship', friendship)
         if(!friendship){
          return res.status(404).json({error:'Friend request not found'})
         }

            if(friendship.friend.toString() !== userId){
                return res.status(403).json({error:'You are not authorized to respond to this friend request'})
            }
            
            if (friendship.status !== 'pending') {
            return res.status(400).json({ error: 'Request is no longer pending.' });
        }

        if( action === 'accepted'){
            friendship.status = 'accepted';
            await friendship.save();
            
         

            res.status(200).json({message:'Friend request accepted'})
        }   else if( action ==='rejected'){
         await Friendship.findByIdAndDelete(friendReqId);
            res.status(200).json({message:'Friend request rejected'})
        }else {
            res.status(400).json({error:'Invalid action'})
        }

    }
    catch(err){
        res.status(500).json({error:'Failed to respond to friend request'})
    }
});



app.get('/userScore', auth, async (req, res)=>{

    try {
        const userData = await user.findById(req.user.id );
          if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
     const formattedUserData = {
      id: userData._id,
      username: userData.username,
      level: userData.level,
      points: userData.points,
    };
    
    res.status(200).json(formattedUserData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// app.get('/allTasks', auth, async (req, res)=>{

//     try {
//         const allToDos = await todo.find({ user: req.user.id });
//         const formattedTodos = allToDos.map( toDoItem => ({
//               id:toDoItem._id,
//               task: toDoItem.task,
//               completed: toDoItem.completed,
//               pointsValue: toDoItem.pointsValue,
//               createdAt: toDoItem.createdAt

//         }))
//         res.status(200).json(formattedTodos);
//     }catch(err){
//         res.status(401).json({error:err.message})
//     }
// });
// app.post('/createTask',auth, async(req,  res) => {

// try {
//     const {task} = req.body;
//     // console.log('taskk',  {task} )
//     const newTodo = new todo({
//         task,
//         user:req.user.id
//     });
//     const savedTodo = await newTodo.save();
//     res.status(201).json(savedTodo);

// } catch (error) {
//     res.status(500).json({error: 'Failed to create todo'});
// }

// })
// app.put('/taskById/:id', auth, async(req, res) => {

//     try{
//         const {id} = req.params;
//         const {task} = req.body;
//         const updatedToDo = await todo.findOneAndUpdate(  { _id: id, user: req.user.id }, {task}, {new:true});
//   // If no todo was found with that ID, send a 404 status.
//     if (!updatedToDo) {
//       return res.status(404).json({ error: 'Todo not found' });
//     }
//         res.status(200).json(updatedToDo);
//     } catch(err){
//         res.status(404).json({err:err.message})
//     }

// })

// app.put('/taskById/:id/complete' , auth, async(req, res) => {

//     try{
//         const {id} = req.params;
//         const completedToDo = await todo.findOneAndUpdate(
//             {_id:id , user:req.user.id},
//             {completed:true},
//             {new:true}
//         );  
//         console.log('completedToDo', completedToDo)

//         if(!completedToDo){
//              console.log('completedToDo', completedToDo)
//             return res.status(404).json({error:'Todo not found'})
//         }


//         const now = new Date();
//         const createdAt = completedToDo.createdAt;
//         console.log('createdAt', createdAt)
//         const hoursPassed = (now - createdAt) / (1000*60*60 ); // Convert milliseconds to hours
//         let pointsEarned = completedToDo.pointsValue;
//         const pointsToSubtract = Math.floor(hoursPassed / 3);
//         pointsEarned = Math.max(0,pointsEarned - pointsToSubtract)
//         console.log(`Task completed. Initial points: ${completedToDo.pointsValue}. Hours passed: ${hoursPassed.toFixed(2)}. Points subtracted: ${pointsToSubtract}. Points earned: ${pointsEarned}.`);



// const user = await user.findById(req.user.id);
// if(user){
//     const newPoints = user.points +pointsEarned;
//     let newLevel = user.level;
//         if(newPoints >= newLevel * 100){
//             newLevel ++;
//             console.log(`User ${user.username} leveled up to Level ${newLevel}!`);
//         }
//         await user.findByIdAndUpdate(req.user.id , {
//             $set:{
//                 points:newPoints,
//                 level:newLevel
//             }
//         })
//   const formattedUserData = {
//       id: user._id,
//       level: user.level,
//       points: user.points,
//     };
    
//     res.status(200).json(formattedUserData);

// }


//     } catch (err) {
//     res.status(500).json({ error: err.message });
//   }


// } );

// app.delete('/deleteById/:id' ,auth, async(req , res)=>{

//     try {
//         const {id}= req.params;
//         const deletedToDo = await todo.findOneAndDelete({ _id: id, user: req.user.id });
//         if(!deletedToDo){
//             return res.status(404).json({error:'Todo not found'})
//         }
//         res.status(204).send();
//     } catch (err){
//             res.status(500).json({ error: err.message });
//     }
// }) 

connectDB();
// connection 

    app.listen(PORT, () => 
        console.log(`Server is running on http://localhost:${PORT}`)
    );

