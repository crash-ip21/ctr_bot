const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Clan = new Schema({
  discordId: String,
  flag: String,
  psn: String,
  character: String,
  track: String,
  nat: String,
  discordVc: Boolean,
  ps4Vc: Boolean,
  favCharacter: String,
  favTrack: String,
  birthday: String,
});

module.exports = model('players', Clan);
