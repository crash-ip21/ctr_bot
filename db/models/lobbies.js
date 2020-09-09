const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Lobby = new Schema({
  date: { type: Date, default: Date.now },
  guild: String,
  channel: String,
  message: String,
  creator: String,
  items: { type: Boolean, default: true },
  pools: { type: Boolean, default: true },
  started: { type: Boolean, default: false },
  startedAt: { type: Date, default: null },
  closed: { type: Boolean, default: false },
  players: [String],
  locked: {
    rank: Number,
    shift: Number,
  },
  duos: { type: Boolean, default: false },
  duosList: Array,
  battle: { type: Boolean, default: false }
});

module.exports = model('lobbies', Lobby);
