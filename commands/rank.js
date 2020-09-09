const Player = require('../db/models/player');
const Rank = require('../db/models/rank');

function sendMessage(message, rank) {
  let items = 'No rank';
  let itemless = 'No rank';
  let duos = 'No rank';
  let battle = 'No rank';

  if (rank.itemRank) {
    items = `#${rank.itemPosition + 1} - ${parseInt(rank.itemRank, 10)}`;
  }

  if (rank.itemlessRank) {
    itemless = `#${rank.itemlessPosition + 1} - ${parseInt(rank.itemlessRank, 10)}`;
  }

  if (rank.duosRank) {
    duos = `#${rank.duosPosition + 1} - ${parseInt(rank.duosRank, 10)}`;
  }

  if (rank.battleRank) {
    battle = `#${rank.battlePosition + 1} - ${parseInt(rank.battleRank, 10)}`;
  }

  message.channel.send({
    embed: {
      title: `${rank.name}'s ranks`,
      fields: [
        {
          name: 'Items',
          value: items,
          inline: true,
        },
        {
          name: 'Itemless',
          value: itemless,
          inline: true,
        },
        {
          name: 'Duos',
          value: duos,
          inline: true,
        },
        {
          name: 'Battle Mode',
          value: battle,
          inline: true
        }
      ],
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
          return message.channel.send('player has no rank');
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
