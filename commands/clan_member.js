const Discord = require('discord.js');
const Clan = require('../db/models/clans');

const ADD = 'add';
const REMOVE = 'remove';

const sendWithoutPing = (channel, message) => channel.send('...').then((m) => m.edit(message));

const executeAction = (message, action, clan, mention) => {
  const role = message.guild.roles.cache.find((r) => r.name === clan.fullName);
  const { channel } = message;
  if (!role) {
    return channel.send(`There is no role with the clan name \`${clan.fullName}\``);
  }

  const user = message.mentions.users.first();
  message.guild.members.fetch(user).then((member) => {
    if (!member) {
      return sendWithoutPing(channel, `Couldn't find the user ${member}`);
    }

    switch (action) {
      case ADD:
        if (member.roles.cache.has(role.id)) {
          return sendWithoutPing(channel, `${member} already has a ${role} role`);
        }
        member.roles.add(role).then(() => {
          sendWithoutPing(channel, `Role ${role} was added to the user ${member}`);
        });

        break;
      case REMOVE:
        if (!member.roles.cache.has(role.id)) {
          return sendWithoutPing(channel, `${member} doesn't have ${role} role`);
        }
        member.roles.remove(role).then(() => {
          sendWithoutPing(channel, `Role ${role} was removed from the user ${member}`);
        });

        break;
    }
  });
};

module.exports = {
  name: 'clan_member',
  description(message) {
    if (message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])) {
      return `Edit clan members.
\`!clan_member add CTR @user
!clan_member remove CTR @user\``;
    }

    return `Edit clan members (Accessible for @Captain only).
\`!clan_member add @user
!clan_member remove @user\``;
  },
  guildOnly: true,
  execute(message, args) {
    //  !clan_member add [CTR] @tag
    //  !clan_member remove [CTR] @tag

    const action = args[0];

    const actions = [ADD, REMOVE];
    if (actions.includes(action)) {
      const isCaptain = message.member.roles.cache.find((r) => r.name === 'Captain');
      const isStaff = message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);

      if (!isCaptain && !isStaff) {
        return message.channel.send('You don\'t have permission to do that!');
      }
      let clanName; let
        mention;

      if (isStaff) {
        const wrongArgumentsStaff = 'Wrong arguments. Example usage: `!clan_member add CTR @user`';
        clanName = args[1];
        mention = args[2];

        if (!clanName || !mention) {
          return message.channel.send(wrongArgumentsStaff);
        }

        if (!mention.match(Discord.MessageMentions.USERS_PATTERN)) {
          return message.channel.send(wrongArgumentsStaff);
        }
      } else if (isCaptain) {
        const wrongArgumentsCaptain = 'Wrong arguments. Example usage: `!clan_member add @user`';

        if (args.length > 2) {
          return message.channel.send(wrongArgumentsCaptain);
        }
        mention = args[1];

        if (!mention.match(Discord.MessageMentions.USERS_PATTERN)) {
          return message.channel.send(wrongArgumentsCaptain);
        }
      }

      if (isCaptain && !isStaff) {
        const staffRole = message.guild.roles.cache.find((r) => r.name === 'Staff');

        const roleNames = message.member.roles.cache.map((r) => r.name);
        Clan.find({ fullName: { $in: roleNames } }).then((docs) => {
          if (!docs.length) {
            return message.channel.send(`You are the captain with no team. ${staffRole}`);
          }

          if (docs.length > 1) {
            return message.channel.send(`You are the captain of several teams. It is not allowed. ${staffRole}`);
          }

          const clan = docs[0];
          // if (clanName && clanName.toLowerCase() !== clan.shortName && clanName.toLowerCase() !== clan.fullName) {
          //   return message.channel.send('You are not the captain of this clan.');
          // }

          executeAction(message, action, clan, mention);
        });
      } else {
        Clan.findOne({ shortName: clanName }).then((clan) => {
          if (!clan) {
            return message.channel.send('There is no clan with this short name.');
          }
          executeAction(message, action, clan, mention);
        });
      }
    }
  },
};
