const express = require('express');
const app = express();
require('dotenv').config();
require('./models/dbConfig');
const gamesRoutes = require('./routes/controller');

app.use('/', gamesRoutes);

app.listen(5500, () => console.log('Servver started: 5500'));