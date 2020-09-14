const deletePrivateLobbyByUser = require('../utils/deletePrivateLobby');
const PrivateLobby = require('../db/models/private_lobbies');

module.exports = {
  name: 'delete_private_lobby',
  description: 'Delete a private lobby. Usage: `!delete_private_lobby`',
  guildOnly: true,
  execute(message, args) {
    const privateLobbyPromise = PrivateLobby.findOne({ creator: message.member.user.id });

    privateLobbyPromise.then((privateLobby) => {
      if (!privateLobby) {
        return message.channel.send('You have not started a private lobby.');
      }
      deletePrivateLobbyByUser(message.channel, message.member.user.id);
      return message.channel.send('Your private lobby was removed.');
    });
  },
};
