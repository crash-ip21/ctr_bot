const fs = require('fs');

module.exports = {
  name: 'list_tracks',
  description: 'Tracks list. Retro Stadium excluded.',
  guildOnly: true,
  execute(message) {
    fs.readFile('tracks.txt', 'utf8', (err, data) => {
      if (err) throw err;
      const tracks = data.trim().split('\n');
      const out = tracks.map((track, index) => `${index + 1}: ${track}`).join('\n');
      message.channel.send(`\`\`\`${out}\`\`\``);
    });
  },
};
