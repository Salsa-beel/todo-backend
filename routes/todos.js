const express = require('express');
const router = express.Router();
const {getallTasks,createTask,updatedTask,completeTask,deleteTask} = require('../controllers/todoController.js');
const {auth} = require('../middleware/authMiddleware');

router.get('/allTasks',auth,getallTasks);
router.post('/createTask',auth,createTask);
router.put('/taskById/:id',auth,updatedTask);
router.patch('/taskById/:id/complete',auth,completeTask);
router.delete('/deleteById/:id',auth,deleteTask);


module.exports = router;

