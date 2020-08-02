const sendLogMessage = require('../utils/sendLogMessage');
const Config = require('../db/models/config');

module.exports = {
  name: 'delete_last_dm',
  description: 'delete_last_dm',
  noHelp: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    message.mentions.members.forEach((member) => {
      member.createDM().then((dm) => {
        dm.messages.fetch().then((messages) => {
          const msg = messages.first();
          message.channel.send(`Deleting the message:\n\`\`\`${msg.content}\`\`\``);
          msg.delete();
        });
      });
    });
  },
};
