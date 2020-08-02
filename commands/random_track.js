const fs = require('fs');

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
  // The maximum is exclusive and the minimum is inclusive
}

module.exports = {
  name: 'rng',
  description: 'Picks random track from the list of all tracks (`!list_tracks`).',
  guildOnly: true,
  aliases: ['random_track'],
  cooldown: 10,
  execute(message, args) {
    let number;
    if (args.length) {
      number = Number(args[0]);
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(number)) {
        return message.channel.send('Not a number.');
      }

      if (number <= 0) {
        return message.channel.send('Nice try.');
      }

      if (number > 39) {
        return message.channel.send('Last time I checked, we had only 39 tracks.');
      }

      if (number === 1) {
        number = null;
      }
    }

    fs.readFile('tracks.txt', 'utf8', (err, data) => {
      if (err) throw err;
      const tracks = data.trim().split('\n');
      const tracksCount = tracks.length;

      const indexes = Array(number).fill(0).map(() => getRandomInt(0, tracksCount));
      const maps = indexes.map((index) => `${+index + 1}: ${tracks[index]}`).join('\n');
      message.channel.send(`\`\`\`${maps}\`\`\``);
    });
  },
};
