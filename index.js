// ------SETUP----------------------------------------------------
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { ObjectId } = require('mongodb');

// create express server
const app = express();

// connect to mongodb
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.log(err));

// mount body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// mount cors for freeCodeCamp tests
app.use(cors());

// serve static assets & index.html
app.use(express.static(`${process.cwd()}/public`))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// ------MODELS-------------------------------------------------------
// user model
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
});

const User = mongoose.model('User', userSchema);

// exercise model
const exerciseSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true,
    unique: false
  },
  description: {
    type: String,
    required: false,
    unique: false
  },
  duration: {
    type: Number,
    required: false,
    unique: false
  },
  date: {
    type: Date,
    required: false,
    unique: false
  }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// ------ROUTES-------------------------------------------------------
// create a new user
app.post('/api/users', async function (req, res) {
  try {
    const username = req.body.username;
    let find_user = await User.findOne({ username: username });

    if (find_user) {
      res.json({
        message: "User already exists"
      })
    } else {
      const user = new User({ username });
      await user.save();

      find_user = await User.findOne({ username: username });

      res.json({
        username: username,
        _id: find_user._id
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// get all users
app.get('/api/users', async function (req, res) {
  try {
    const users = await User.find();

    res.send(users)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

// add exercise for a user
app.post('/api/users/:_id/exercises', async function (req, res) {
  try {
    const userid = req.params._id;

    const description = req.body.description;
    const duration = req.body.duration;

    let date;
    !req.body.date ? date = new Date().toString().slice(0, 15) : date = new Date(req.body.date).toString().slice(0, 15);

    const find_user_by_id = await User.findById(userid);

    if (!find_user_by_id) {
      res.json({
        message: "Invalid user id"
      });
    } else if (!description) {
      res.json({
        message: "Description must be provided"
      })
    } else if (!duration) {
      res.json({
        message: "Duration must be provided"
      })
    } else {
      const exercise = new Exercise({ userid, description, duration, date });
      await exercise.save();

      res.json({
        username: find_user_by_id.username,
        description: description,
        duration: parseInt(duration),
        date: date,
        _id: find_user_by_id._id
      })
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// get a user's exercise log
app.get('/api/users/:_id/logs', async function (req, res) {
  try {
    let log = [];
    const userid = req.params._id;

    const fromDate = req.query.from;
    const toDate = req.query.to;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    const query = { userid: userid };
    if (fromDate) query.date = { $gte: new Date(fromDate) };
    if (toDate) query.date = { ...query.date, $lte: new Date(toDate) };

    let exercises;
    if (limit) {
      exercises = await Exercise.find(query).limit(limit);
    } else {
      exercises = await Exercise.find(query);
    };

    const user = await User.findById(userid);

    exercises.forEach(element => {
      let exercise = {
        description: element.description,
        duration: element.duration,
        date: new Date(element.date).toString().slice(0, 15)
      }

      log.push(exercise);
    });

    res.json({
      username: user.username,
      count: log.length,
      _id: userid,
      log: log
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -----LISTEN FOR REQUESTS---------------------------------------------------------
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
