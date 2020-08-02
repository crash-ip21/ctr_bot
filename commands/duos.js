const moment = require('moment');
const Duo = require('../db/models/duos');

module.exports = {
  name: 'duos',
  description: 'Active duos list',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  async execute(message) {
    const { guild } = message;

    Duo.find({ guild: guild.id }).then((duos) => {
      const out = duos.map((duo) => `${moment(duo.date).format('YYYY-MM-DD HH:mm:ss')} <@${duo.discord1}> & <@${duo.discord2}>`);
      message.channel.send('...').then((msg) => { msg.edit(out.join('\n')); });
    });
  },
};
