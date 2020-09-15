const Player = require('../db/models/player');
const createPageableContent = require('../utils/createPageableContent');

/**
 * Returns the embed
 * @param flag
 * @param players
 * @param maxPlayers
 * @param page
 * @param pages
 * @returns {string}
 */
function getOutput(flag, players, maxPlayers, page, pages) {
  return `**Players from ${flag} (${maxPlayers})**
  
${players.join('\n')}

> Page ${page} of ${pages}`;
}

module.exports = {
  name: 'countries',
  description: 'Countries of members.',
  guildOnly: true,
  aliases: ['country'],
  execute(message, args) {
    message.guild.members.fetch().then((members) => {
      if (!args.length) {
        const membersIds = Array.from(members.keys());
        Player.aggregate([
          {
            $match: { flag: { $ne: null }, discordId: { $in: membersIds } },
          },
          {
            $group: {
              _id: '$flag',
              count: { $sum: 1 },
            },
          },
          {
            $sort: { count: -1 },
          },
        ]).then((counts) => {
          const out = counts.map((c) => `${c._id} ${c.count}`).join('\t');

          message.channel.send(out);
        });
      } else {
        const flag = args.shift();

        if (!message.client.flags.includes(flag)) {
          return message.channel.send('You should specify country flag. To see them all use the `!flags` command');
        }

        Player.find({ flag }).then(async (players) => {
          if (players.length <= 0) {
            return message.channel.send(`There are no players from ${flag}.`);
          }
  
          players = players.filter((p) => members.has(p.discordId)).map((p) => `<@${p.discordId}>`);
  
          createPageableContent(message.channel, message.author.id, {
            outputType                : 'text',
            elements                  : players,
            elementsPerPage           : 20,
            textOptions               : { heading: `Players from ${flag} (${players.length})` },
            reactionCollectorOptions  : { time: 3600000 }
          });
        });
      }
    });
  },
};
