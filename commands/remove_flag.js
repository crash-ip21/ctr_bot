const Player = require('../db/models/player');

module.exports = {
  name: 'remove_flag',
  description: 'Set your country flag.',
  aliases: ['remove_country'],
  execute(message, args) {
    const isStaff = message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);

    let discordId;

    if (isStaff) {
      if (args.length === 1) {
        discordId = message.mentions.members.first().id;
      } else {
        return message.channel.send('Nope.');
      }
    } else if (args.length > 0) {
      return message.channel.send('Nope.');
    } else {
      return message.channel.send('Nope.');
      // discordId = message.author.id;
    }

    Player.findOne({ discordId }).then((doc) => {
      if (doc) {
        doc.delete().then(() => {
          message.channel.send('Flag has been removed.');
        });
      } else {
        if (isStaff) {
          return message.channel.send('The user has no flag.');
        }
        return message.channel.send('You have no flag.');
      }
    });
  },
};
