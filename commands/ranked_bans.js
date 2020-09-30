const moment = require('moment');
const RankedLobby = require('../db/models/ranked_lobbies').default;
const RankedBan = require('../db/models/ranked_bans');
const findMember = require('../utils/findMember');

module.exports = {
  name: 'ranked_bans',
  description: 'Ranked bans',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  aliases: ['ranked_ban'],
  async execute(message, args) {
    if (args.length) {
      const argument = args[0];
      let member = message.mentions.users.first();
      if (!member) {
        try {
          member = await findMember(message.guild, argument);
        } catch (error) {
          return message.channel.send(error.message);
        }
      }

      let duration;
      if (args.length > 1) {
        const arg = args.slice(1).join(' ');
        const match = arg.match(/(\d+)\s?(\w+)/);
        if (match) {
          const inp = match[1];
          const unit = match[2];
          duration = moment.duration(inp, unit);
        }
      }

      RankedBan.findOne({ discordId: member.id, guildId: message.guild.id }).then((doc) => {
        if (doc) {
          return message.channel.send('This member is already banned.');
        }

        const rb = new RankedBan();
        rb.guildId = message.guild.id;
        rb.discordId = member.id;
        rb.bannedAt = new Date();
        rb.bannedBy = message.author.id;

        if (duration) {
          rb.bannedTill = moment().add(duration);
        }

        const savePromise = rb.save();

        const lobbiesChannel = message.guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
        const overwritePromise = lobbiesChannel.createOverwrite(member, { VIEW_CHANNEL: false });

        const msg = message.channel.send('...');

        RankedLobby.find({ guild: message.guild.id, players: member.id, started: false }).then((docs) => {
          docs.forEach(async (doc) => {
            const guild = message.client.guilds.cache.get(doc.guild);
            if (guild) {
              const channel = guild.channels.cache.get(doc.channel);
              if (channel) {
                channel.messages.fetch(doc.message).then((msg) => {
                  if (doc.type === 'duos') {
                    const duo = doc.teamList.filter((d) => d.includes(member.id));
                    duo.forEach((d) => {
                      d.forEach((p) => {
                        msg.reactions.cache.get('✅').users.remove(p);
                      });
                    });
                  } else {
                    msg.reactions.cache.get('✅').users.remove(member.id);
                  }
                });
              }
            }
          });
        });

        Promise.all([msg, savePromise, overwritePromise]).then(([m]) => {
          let output = `${member} was banned from ranked FFAs`;
          if (duration) {
            output += ` for ${duration.humanize()}`;
          }
          m.edit(output);
        });
      });
    } else {
      message.channel.send('...').then((m) => {
        RankedBan.find({ guildId: message.guild.id }).then(async (docs) => {
          if (!docs.length) {
            return m.edit('There are no bans. Yet.');
          }

          const bannedMembers = [];

          message.guild.members.fetch().then((members) => {
            docs.forEach((doc) => {
              let member = members.get(doc.discordId);
              if (!member) {
                member = `<@${doc.discordId}> [user left the server]`;
              }

              let till = 'forever';
              if (doc.bannedTill) {
                // noinspection JSCheckFunctionSignatures
                till = moment(doc.bannedTill).utc().format('YYYY-MM-DD HH:mm:ss z');
              }
              const out = `${member} banned till ${till}`;

              bannedMembers.push(out);
            });
            m.edit(bannedMembers);
          });
        });
      });
    }
  },
};
