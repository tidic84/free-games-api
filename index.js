const express = require('express');
const app = express();
require('dotenv').config();
require('./models/dbConfig')

app.listen(5500, () => console.log('Servver started: 5050'));