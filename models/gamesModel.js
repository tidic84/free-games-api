const mongoose = require('mongoose');

const FreeGamesModel = mongoose.model(
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
        gameId:{
            type: String,
            required: true
        },
        discount_expiration: {
            type: String,
            required: true
        }
    },
    'free-games'
);
const DiscountedGamesModel = mongoose.model(
    'discounted-games-api',
    {
        game: {
            type: String,
            required: true
        },
        platform: {
            type: String,
            required: true
        },
        gameId:{
            type: String,
            required: true
        },
        discount_expiration: {
            type: String,
            required: true
        },
        discount_percent: {
            type: String,
            required: true
        },
        price: {
            type: String,
            required: true
        }
    },
    'discounted-games'
);

module.exports = { FreeGamesModel, DiscountedGamesModel };