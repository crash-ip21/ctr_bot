const bot = require('../bot');

module.exports = {
  name: 'cancel',
  description: 'Cancel.',
  noHelp: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    const { confirmations } = bot;

    const authorId = message.author.id;
    if (!confirmations.has(authorId)) {
      return message.reply('You don\'t have anything to cancel!');
    }

    const userConfirmation = confirmations.get(authorId);
    if (!userConfirmation) {
      return message.reply('You don\'t have anything to cancel!');
    }

    const command = userConfirmation.get('command');
    if (command) {
      userConfirmation.delete('command');
      return message.reply(`You cancelled \`${command}\``);
    }
    return message.reply('You don\'t have anything to cancel!');
  },
};
