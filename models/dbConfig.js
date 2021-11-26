const mongoose = require('mongoose');

mongoose.connect(
    'mongodb://localhost:27017/free-games-api',
    { useNewUrlParser: true , useUnifiedTopology: true },
    (err) => {
        if (!err)console.log('MongoDB connection succeeded.');
        else console.log('Error in DB connection: ' + err);
    }
);
