const express = require('express');
const app = express();
require('dotenv').config();
require('./fetch/getDiscountedGames')
const gamesRoutes = require('./routes/FreeGamesController');
const bodyParser = require('body-parser');
const cors = require('cors');
// const path = require('path');

app.use(bodyParser.json());
app.use(cors());

// var options = { root: path.join(__dirname) };

app.use('/games', gamesRoutes);
app.use(express.static("public"));

app.get('*', function(req, res){
    res.status(404).send('Not Found !!!!!!!!  err 404');
});
app.listen(25565, () => console.log('Server started: 25565'));