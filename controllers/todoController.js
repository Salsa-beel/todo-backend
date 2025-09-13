const todo = require("../models/Todo");

const getallTasks = async (req, res) => {
  try {
    const AllToDos = await todo.find({ user: req.user.id });
    const formattedTodos = AllToDos.map((toDoItem) => ({
      id: toDoItem._id,
      task: toDoItem.task,
      completed: toDoItem.completed,
      pointsValue: toDoItem.pointsValue,
      createdAt: toDoItem.createdAt,
    }));
    res.json(formattedTodos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const createTask = async (req, res) => {
  try {
    const { task } = req.body;
    const newTodo = new todo({
      task,
      user: req.user.id,
    });
    const savedTodo = await newTodo.save();
    res.status(201).json({
      savedTodo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
const updatedTask = async (req, res) => {
  try {
    const { todoId } = req.params;
    const { task } = req.body;
    const updatedToDo = await todo.findOneAndUpdate(
      { _id: todoId, user: req.user.id },
      { task },
      { new: true }
    );
    if (!updatedToDo) {
      return res.status(404).json({ error: "ToDo not found" });
    }
    res.status(200).json(updatedToDo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const completeTask = async (req, res) => {
  try {
    const { todoId } = req.params;
    const completedToDo = await todo.findOneAndUpdate(
      { _id: todoId, user: req.user.id },
      { completed: true },
      { new: true }
    );
    if (!completedToDo) {
      console.log("completedToDo", completedToDo);
      return res.status(404).json({ error: "Todo not found" });
    }
    const now = new Date();
    const createdAt = completedToDo.createdAt;
    console.log("createdAt", createdAt);
    const hoursPassed = (now - createdAt) / (1000 * 60 * 60); // Convert milliseconds to hours
    let pointsEarned = completedToDo.pointsValue;
    const pointsToSubtract = Math.floor(hoursPassed / 3);
    pointsEarned = Math.max(0, pointsEarned - pointsToSubtract);
    console.log(
      `Task completed. Initial points: ${
        completedToDo.pointsValue
      }. Hours passed: ${hoursPassed.toFixed(
        2
      )}. Points subtracted: ${pointsToSubtract}. Points earned: ${pointsEarned}.`
    );

    const user = await user.findById(req.user.id);
    if (user) {
      const newPoints = user.points + pointsEarned;
      let newLevel = user.level;
      if (newPoints >= newLevel * 100) {
        newLevel++;
        console.log(`User ${user.username} leveled up to Level ${newLevel}!`);
      }
      await user.findByIdAndUpdate(req.user.id, {
        $set: {
          points: newPoints,
          level: newLevel,
        },
      });
      const formattedUserData = {
        id: user._id,
        level: user.level,
        points: user.points,
      };

      res.status(200).json(formattedUserData);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteTask= async (req, res) => {
    try{
        const {todoId} = req.params;
        const deletedToDo = await todo.findOneAndDelete({_id:todoId,user:req.user.id});
        if(!deletedToDo){
            return res.status(404).json({error:'ToDo not found'});
        }
        res.status(204).send();
    }catch (err){
            res.status(500).json({ error: err.message });
    }
};

module.exports = { getallTasks, createTask, updatedTask, completeTask, deleteTask };