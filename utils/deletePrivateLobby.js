const PrivateLobby = require('../db/models/private_lobbies');

/**
 * Deletes a private lobby by a given user
 * @param channel
 * @param userId
 */
function deletePrivateLobbyByUser(channel, userId) {
    const privateLobbyPromise = PrivateLobby.findOne({ creator: userId });
    
    Promise.resolve(privateLobbyPromise).then((privateLobby) => {
        if (privateLobby) {
            channel.messages.fetch(privateLobby.message).then((privateLobbyMessage) => {
                const fetchPromise = privateLobbyMessage.fetch(true);
                
                Promise.resolve(fetchPromise).then((m) => {
                    if (!m.deleted) {
                        m.unpin();
                        m.fetch(true);
                        m.delete();
                    }
                })
            });
            
            const deletePromise = PrivateLobby.deleteOne({ creator: userId });
            Promise.resolve(deletePromise).then(() => {});
        }
    }).catch(() => {});
}

module.exports = deletePrivateLobbyByUser;