const mongoose = require('mongoose');

mongoose.connect(
    `${process.env.MONGODB_URL}`,
    { useNewUrlParser: true , useUnifiedTopology: true },
    (err) => {
        if (!err)console.log('MongoDB connection succeeded.');
        else console.log('Error in DB connection: ' + err);
    }
);
