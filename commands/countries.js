const Player = require('../db/models/player');
const createPagination = require('../utils/createPagination');

/**
 * Returns the embed
 * @param flag
 * @param players
 * @param maxPlayers
 * @param page
 * @param pages
 * @returns {{footer: {text: string}, fields: [{name: string, value: *}]}}
 */
function getEmbed(flag, players, maxPlayers, page, pages) {
  return {
    fields: [
      {
        name: `Players from ${flag} (${maxPlayers})`,
        value: players.join('\n')
      }
    ],
    footer: {
      text: `Page ${page} of ${pages}`
    }
  }
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
          
          const elementsPerPage = 20;
          let page = 1;
          let pagination = createPagination(players, page, elementsPerPage);
          let embed = getEmbed(flag, pagination.elements, players.length, page, pagination.pages);
          
          message.channel.send({ embed: embed }).then((m) => {
            if (pagination.pages > 1) {
              m.react('⬅️');
              m.react('➡️');
              
              // only the user that executed the command can react
              const filter = (r, u) => (['⬅️', '➡️'].includes(r.emoji.name) && u.id !== m.author.id && u.id === message.author.id);
              const options = {
                time: 3600000,
                errors: ['time'],
                dispose: true
              }
              
              const collector = m.createReactionCollector(filter, options);
              collector.on('collect', (reaction, user) => {
                if (reaction.message.id === m.id) {
                  if (reaction.emoji.name === '⬅️') {
                    page--;
                    
                    if (page < 1) {
                      page = 1;
                    }
                  }
                  
                  if (reaction.emoji.name === '➡️') {
                    page++;
                    
                    if (page > pagination.pages) {
                      page = pagination.pages;
                    }
                  }
                  
                  pagination = createPagination(players, page, elementsPerPage);
                  embed = getEmbed(flag, pagination.elements, players.length, page, pagination.pages);
                  
                  m.edit({ embed: embed });
                }
              });
            }
          });
        });
      }
    });
  },
};
