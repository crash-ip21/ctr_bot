const moment = require('moment');
const Ban = require('../db/models/bans');

module.exports = {
  name: 'bans',
  description: 'bans',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    message.guild.fetchBans()
      .then(async (banned) => {
        const list = [];

        for (const ban of banned.array()) {
          const { user } = ban;
          const item = [user.id, user.tag, ban.reason || 'No reason provided'];

          const banInfo = await Ban.findOne({ discordId: user.id });
          if (banInfo) {
            const durationLeft = moment(banInfo.bannedTill).fromNow();
            item.push(`Unban ${durationLeft}`);
          } else {
            item.push('Manual');
          }

          list.push(item.join(' | '));
        }

        message.channel.send(`**${banned.size} users are banned:**\n\`\`\`${list.join('\n')}\`\`\``);
      })
      .catch(console.error);
  },
};
