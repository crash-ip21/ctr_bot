const fs = require('fs');
const Player = require('../db/models/player');

module.exports = {
  name: 'set_track',
  usage: '[track]',
  description: 'Set your favorite track.',
  guildOnly: true,
  execute(message, args) {
    fs.readFile('tracks.txt', 'utf8', (err, data) => {
      if (err) throw err;
      const tracks = data.trim().split('\n');
      tracks.push('Retro Stadium'); // Missing in the file

      if (args.length < 1) {
        return message.channel.send('You need to specify a track.');
      }

      const input = args.join(' ');
      const track = tracks.find((t) => t.toLowerCase() === input.toLowerCase());

      if (!track) {
        return message.channel.send(`The track "${input}" doesn't exist.`);
      }

      Player.updateOne({ discordId: message.author.id }, { favTrack: track }).exec();
      return message.channel.send(`Your favorite track has been set to "${track}".`);
    });
  },
};
