const Clan = require('../db/models/clans');

const sendWithoutPing = (channel, message) => channel.send('...').then((m) => m.edit(message));

const executeAction = (message, clan) => {
  const role = message.guild.roles.cache.find((r) => r.name === clan.fullName);
  const { channel } = message;
  if (!role) {
    return channel.send(`There is no role with the clan name \`${clan.fullName}\``);
  }

  message.channel.send(`Are you sure you want to leave \`${clan.fullName}\`? yes/no`)
    .then(() => {
      message.channel
        .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
        .then((collected) => {
          const { content } = collected.first();
          if (content.toLowerCase() === 'yes') {
            const user = message.author;
            message.guild.members.fetch(user).then((member) => {
              if (!member) {
                return sendWithoutPing(channel, `Couldn't find the user ${member}`);
              }

              if (!member.roles.cache.has(role.id)) {
                return sendWithoutPing(channel, `${member} doesn't have ${role} role`);
              }
              member.roles.remove(role).then(() => {
                message.channel.send('...').then((m) => m.edit(`Role ${role} was removed from you.`));
              });
            });
          } else {
            throw new Error('cancel');
          }
        })
        .catch(() => {
          message.channel.send('Command cancelled');
        });
    });
};

module.exports = {
  name: 'leave_clan',
  aliases: ['leave_team', 'clan_leave'],
  description: 'Allows you to leave your clan.',
  guildOnly: true,
  execute(message, args) {
    const clanName = args.shift();

    if (!clanName) {
      const roleNames = message.member.roles.cache.map((r) => r.name);
      Clan.find({ fullName: { $in: roleNames } }).then((docs) => {
        if (!docs.length) {
          return message.channel.send('You are not in any teams.');
        }

        if (docs.length > 1) {
          const clanNames = docs.map((d) => d.shortName).join(', ');
          return message.channel.send(`You in several teams (${clanNames}), you should specify which one you want to leave.`);
        }

        const clan = docs.shift();

        executeAction(message, clan);
      });
    } else {
      Clan.findOne({ shortName: clanName }).then((clan) => {
        if (!clan) {
          return message.channel.send('There is no clan with this short name.');
        }
        executeAction(message, clan);
      });
    }
  },
};
