const config = require('../config.js');

module.exports = {
  name: 'set_nickname',
  description: 'set_nickname',
  noHelp: true,
  execute(message, args) {
    if (message.author.id !== config.owner || message.channel.type !== 'dm') {
      return;
    }

    const { client } = message;
    const { guilds } = client;

    guilds.forEach((guild) => {
      guild.members.cache.find((member) => member.id === client.user.id).setNickname(args.join(' '));
    });
  },
};
