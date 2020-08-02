const Player = require('../db/models/player');
const sendLogMessage = require('../utils/sendLogMessage');

function getUserIdFromMention(message) {
  const { content } = message;
  // The id is the first and only match found by the RegEx.
  const matches = content.match(/<@!?(\d+)>/);

  // If supplied variable was not a mention, matches will be null instead of an array.
  if (!matches) return null;

  // However the first element in the matches array will be the entire mention, not just the ID,
  // so use index 1.
  return matches[1];
}

module.exports = {
  name: 'unset_psn',
  description: 'Unset your PSN.',
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    const isStaff = message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);

    let user;

    if (isStaff && args.length === 1) {
      user = message.mentions.users.first();
    } else if (args.length > 0) {
      return message.channel.send('Nope.');
    } else {
      user = message.author;
    }

    let discordId;
    if (!user) {
      discordId = getUserIdFromMention(message);
    } else {
      discordId = user.id;
    }

    Player.findOne({ discordId }).then((doc) => {
      if (!doc) {
        return message.channel.send('You didn\'t set your PSN yet.');
      }

      if (!doc.psn) {
        return message.channel.send('You didn\'t set your PSN yet.');
      }

      const oldPSN = doc.psn;
      // eslint-disable-next-line no-param-reassign
      doc.psn = null;
      const promise = doc.save();

      promise.then(() => {
        message.channel.send('PSN has been unset.');

        let rankedStaff = '@Ranked Staff';
        const rankedStaffRole = message.guild.roles.cache.find((r) => r.name === 'Ranked Staff');
        if (rankedStaffRole) rankedStaff = rankedStaffRole.toString();
        sendLogMessage(message.guild, `${rankedStaff}
${message.author} unset their PSN.
Old: \`${oldPSN}\``);
      });
    });
  },
};
