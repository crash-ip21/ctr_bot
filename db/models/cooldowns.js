const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Cooldowns = new Schema({
  guildId: String,
  discordId: String,
  name: String,
  count: Number,
  updatedAt: Date,
});

module.exports = model('cooldowns', Cooldowns);
