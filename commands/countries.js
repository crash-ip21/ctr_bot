const Player = require('../db/models/player');

const sendWithoutPing = (channel, message) => channel.send('...').then((m) => m.edit(message));

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
          // const fields = counts.map((c) => ({
          //   name: c._id,
          //   value: c.count,
          //   inline: true,
          // }));

          // const halfLength = Math.floor(out.length / 2);
          // const chunks = [
          //   out.slice(0, halfLength),
          //   out.slice(halfLength),
          // ];
          // const fields = out.map(chunk => {
          //   return {
          //
          //   }
          // })
          // message.channel.send(out);

          message.channel.send(out);
        });
      } else {
        const flag = args.shift();

        if (!message.client.flags.includes(flag)) {
          return message.channel.send('You should specify country flag. To see them all use !flags command');
        }

        Player.find({ flag }).then(async (players) => {
          players = players.filter((p) => members.has(p.discordId)).map((p) => `<@${p.discordId}>`);

          let out = `${flag}`;
          for (const player of players) {
            if (`${out}\n${player}`.length < 2000) {
              out = `${out}\n${player}`;
            } else {
              await sendWithoutPing(message.channel, out);
              out = `${player}`;
            }
          }
          if (out) {
            await sendWithoutPing(message.channel, out);
          }
        });
      }
    });
  },
};
