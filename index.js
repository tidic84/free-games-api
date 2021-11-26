const express = require('express');
const app = express();
require('./models/dbConfig')

app.listen(5500, () => console.log('Servver started: 5050'));