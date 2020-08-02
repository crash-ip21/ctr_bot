const sendLogMessage = require('../utils/sendLogMessage');

module.exports = {
  name: 'dm_id',
  description: 'dm_id',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  args: true,
  usage: '[@tag] [message]',
  async execute(message, args) {
    const id = args[0];
    const user = await message.client.users.fetch(id);

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

    user.createDM().then((dm) => {
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
