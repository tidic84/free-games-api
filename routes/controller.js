const express = require('express');
const router = express.Router();
const ObjectID = require('mongoose').Types.ObjectId;
const { GamesModel } = require('../models/gamesModel');

router.get('/', (req, res) => {
    GamesModel.find((err, games) => {
        if (err) return console.log("Error to get data !");
        res.send(games);
    })
});
    
router.post('/', (req, res) => {
    const newRecord = new GamesModel({
        game: req.body.game,
        platform: req.body.platform
    });
    newRecord.save((err, games) => {
        if (!err) res.send(games)
        else console.log("Error: creating new data: " + err)
    })
})

router.put("/:id", (req, res) => {
    if (!ObjectID.isValid(req.params.id))
        return res.status(400).send("ID unknow : " + req.params.id)
    
    const updateRecord = {
        author: req.body.author,
        message: req.body.message
    };
  
    GamesModel.findByIdAndUpdate(
        req.params.id,
        { $set: updateRecord},
        { new: true },
        (err, docs) => {
            if (!err) res.send(docs);
            else console.log("Update error : " + err);
        }
    )
});

router.delete("/:id", (req, res) => {
    if (!ObjectID.isValid(req.params.id))
      return res.status(400).send("ID unknow : " + req.params.id)
    
      GamesModel.findByIdAndRemove(
      req.params.id,
      (err, docs) => {
        if (!err) res.send(docs);
        else console.log("Delete error : " + err);
      })
  });

module.exports = router;