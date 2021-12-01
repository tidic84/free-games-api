const express = require('express');
const router = express.Router();
const ObjectID = require('mongoose').Types.ObjectId;
const { FreeGamesModel, DiscountedGamesModel } = require('../models/gamesModel');
const discountedSteamGames = require('../fetch/discountedGames');

// function getDiscountedGames(req, res) {
//     discountedSteamGames().then(async game => {
//         // console.log(games);
//         for (let i = 0; i < game.length; i++) {
//             const newRecord = new DiscountedGamesModel({
//                 game: game[i].game,
//                 platform: game[i].platform,
//                 gameId: game[i].gameId,
//                 discount_expiration: game[i].discount_expiration,
//                 discount_percent: game[i].discount_percent,
//                 price: game[i].price
//             })//.then(async (result) => {res.send(result)});
//             // console.log(newRecord);


//             // ### C'est ici le problème ###
//             await newRecord.save((err, games) => {
//                 console.log(game[i].game);
//                 if (!err) return res.send(games)
//                 else console.log("Error: creating new data: " + err)
//             });
//         }
//     })
// }

router.get('/', async (req, res) => {
    
    DiscountedGamesModel.deleteMany({}, (err) => {
        if (err) console.log(err);
    });
    getDiscountedGames(req, res);
    
    
    DiscountedGamesModel.find((err, games) => {
        if (err) return console.log("Error to get data !");
        res.send(games);
    })
});
    
// router.post('/', (req, res) => {
//     const newRecord = new FreeGamesModel({
//         game: req.body.game,
//         platform: req.body.platform
//     });
//     newRecord.save((err, games) => {
//         if (!err) res.send(games)
//         else console.log("Error: creating new data: " + err)
//     })
// })

// router.put("/:id", (req, res) => {
//     if (!ObjectID.isValid(req.params.id))
//         return res.status(400).send("ID unknow : " + req.params.id)
    
//     const updateRecord = {
//         author: req.body.author,
//         message: req.body.message
//     };
  
//     FreeGamesModel.findByIdAndUpdate(
//         req.params.id,
//         { $set: updateRecord},
//         { new: true },
//         (err, docs) => {
//             if (!err) res.send(docs);
//             else console.log("Update error : " + err);
//         }
//     )
// });

// router.delete("/:id", (req, res) => {
//     if (!ObjectID.isValid(req.params.id))
//       return res.status(400).send("ID unknow : " + req.params.id)
    
//       FreeGamesModel.findByIdAndRemove(
//       req.params.id,
//       (err, docs) => {
//         if (!err) res.send(docs);
//         else console.log("Delete error : " + err);
//       })
//   });

module.exports = router;