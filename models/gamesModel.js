const mongoose = require('mongoose');

const GamesModel = mongoose.model(
    'free-games-api',
    {
        game: {
            type: String,
            required: true
        },
        platform: {
            type: String,
            required: true
        },
        // link: {
        //     type: String,
        //     required: true
        // },
        // expiryDate: {
        //     type: Date,
        //     required: true
        // }
    },
    'free-games'
);

module.exports = { GamesModel };