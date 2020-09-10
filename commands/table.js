const drawTable = require('../utils/drawTable');

module.exports = {
  name: 'table',
  description: 'Generate score table. https://gb.hlorenzi.com',
  cooldown: 5,
  guildOnly: true,
  execute(message) {
    const rows = message.content.split('\n');
    rows.shift();

    if (!rows.length) {
      return message.channel.send('Empty table.');
    }

    message.channel.send('Generating the table...').then((m) => {
      drawTable(rows.join('\n')).then((attachment) => {
        message.channel.send(message.author, { files: [attachment] }).then((m2) => {
          message.delete();
          m.delete();
        }).catch(console.error);
      });
    });
  },
};
