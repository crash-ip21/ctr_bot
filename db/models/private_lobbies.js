const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const PrivateLobby = new Schema({
  guild: String,
  channel: String,
  message: String,
  creator: String,
  mode: String,
  maxPlayers: Number,
  players: [String],
  date: String
});

module.exports = model('private_lobbies', PrivateLobby);
