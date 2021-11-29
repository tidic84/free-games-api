const express = require('express');
const app = express();
require('dotenv').config();
require('./models/dbConfig');
const gamesRoutes = require('./routes/controller');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
mongoose.set('returnOriginal', false);

app.use(bodyParser.json());
app.use(cors());
app.get('/', function(req, res) {
    var options = { root: path.join(__dirname) };
    res.sendFile('./index.html', options);
});
app.use('/games', gamesRoutes);

app.listen(5500, () => console.log('Servver started: 5500'));