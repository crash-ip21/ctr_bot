const Player = require('../db/models/player');
const Rank = require('../db/models/rank');
const {
  _4V4, BATTLE, DUOS, ITEMLESS, ITEMS,
} = require('../db/models/ranked_lobbies');

const ranks = {
  [ITEMS]: 'Items',
  [ITEMLESS]: 'Itemless',
  [DUOS]: 'Duos',
  [BATTLE]: 'Battle',
  [_4V4]: '4v4',
};

function sendMessage(message, rank) {
  const fields = Object.entries(ranks).map(([key, name]) => {
    const position = rank[key].position + 1;
    const r = parseInt(rank[key].rank, 10);

    let value = `#${position} - ${r}`;
    if (Number.isNaN(position) || Number.isNaN(r)) value = '-';

    return ({
      name,
      value,
      inline: true,
    });
  });

  message.channel.send({
    embed: {
      title: `${rank.name}'s ranks`,
      fields,
    },
  });
}

module.exports = {
  name: 'rank',
  description: 'Check your rank',
  guildOnly: true,
  cooldown: 10,
  execute(message, args) {
    if (args.length) {
      const psn = args[0];
      Rank.findOne({ name: psn }).then((rank) => {
        if (!rank) {
          return message.channel.send('Player has no rank');
        }

        sendMessage(message, rank);
      });
    } else {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player || !player.psn) {
          return message.reply('you have no rank');
        }

        Rank.findOne({ name: player.psn }).then((rank) => {
          if (!rank) {
            return message.reply('you have no rank');
          }

          sendMessage(message, rank);
        });
      });
    }
  },
};
