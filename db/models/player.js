const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Clan = new Schema({
  discordId: String,
  flag: String,
  psn: String,
});

module.exports = model('players', Clan);
