const PrivateLobby = require('../db/models/private_lobbies');

/**
 * Deletes a private lobby by a given user
 * @param channel
 * @param userId
 */
function deletePrivateLobbyByUser(channel, userId) {
  const privateLobbyPromise = PrivateLobby.findOne({ creator: userId });

  privateLobbyPromise.then((privateLobby) => {
    if (privateLobby) {
      channel.messages.fetch(privateLobby.message).then((m) => {
        m.delete();
      }).catch(() => {});

      PrivateLobby.deleteOne({ creator: userId }).exec();
    }
  }).catch(() => {});
}

module.exports = deletePrivateLobbyByUser;
