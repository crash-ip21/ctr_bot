const findMember = require('../utils/findMember');
const sendLogMessage = require('../utils/sendLogMessage');

module.exports = {
  name: 'dm',
  description: 'dm',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  args: true,
  usage: '[@tag] [message]',
  async execute(message, args) {
    let member = message.mentions.users.first();
    if (!member) {
      try {
        member = await findMember(message.guild, args[0]);
      } catch (error) {
        return message.channel.send(error.message);
      }
    }

    const post = message.content.split(' ').slice(2).join(' ');
    const attachment = message.attachments.first();
    const attachments = [];
    if (attachment) {
      attachments.push(attachment.url);
    }

    const DMCallback = (m) => {
      const logMessage = `Sent message to ${m.channel.recipient}:\n\`\`\`${m.content}\`\`\``;
      sendLogMessage(message.guild, logMessage);
    };

    member.createDM().then((dm) => {
      dm.send(post, { files: attachments })
        .then((m) => {
          DMCallback(m);
          message.channel.send(`Message has been sent to ${member.toString()}`);
        })
        .catch((error) => {
          message.channel.send(error.message);
        });
    });
  },
};
