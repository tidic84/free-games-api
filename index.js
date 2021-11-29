const express = require('express');
const app = express();
require('dotenv').config();
require('./models/dbConfig');
const gamesRoutes = require('./routes/controller');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use('/games', gamesRoutes);

app.listen(5500, () => console.log('Servver started: 5500'));