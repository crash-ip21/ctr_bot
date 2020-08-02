const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Rank = new Schema({
  name: String,
  itemRank: Number,
  itemPosition: Number,
  itemlessRank: Number,
  itemlessPosition: Number,
  duosRank: Number,
  duosPosition: Number,
});

module.exports = model('ranks', Rank);
