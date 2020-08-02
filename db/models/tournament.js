const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Tournament = new Schema({
  enabled: Boolean,
  name: String,
  date: Date,
  type: String,
  signUpsOpen: Date,
  signUpsClose: Date,
  teams: [{
    name: String,
    captain: String,
    players: {
      type: Map,
      of: {
        discordId: Number,
        discordTag: String,
        psn: String,
      },
    },
  }],
});

module.exports = model('tournaments', Tournament);
