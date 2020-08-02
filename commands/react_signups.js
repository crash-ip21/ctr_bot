const config = require('../config.js');
const fetchMessages = require('../utils/fetchMessages');
const sendLogMessage = require('../utils/sendLogMessage');

module.exports = {
  name: 'react_signups',
  description: 'Check and react on every signup message again.',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  noHelp: true,
  execute(message) {
    if (message.author.id !== config.owner) {
      return;
      // return message.reply(`You should have a role ${adminRole} to use this command!`);
    }

    const channel = message.guild.channels.cache.find((c) => c.name === 'signups');
    if (!channel) {
      return message.channel.send('Couldn\'t find a signups channel');
    }

    message.channel.send('Processing...');
    fetchMessages(channel, 500).then((messages) => {
      const promises = messages.map((m) => {
        if (m.type === 'PINS_ADD') {
          return;
        }

        if (m.author.bot) {
          return;
        }

        m.reactions.cache.forEach((reaction) => {
          if (reaction.me) {
            reaction.remove();
          }
        });

        const result = message.client.parseSignup(m);

        const reactionCatchCallback = () => {
          sendLogMessage(`Couldn't react to the message by ${m.author}.`);
        };

        if (!result.errors.length) {
          return m.react('✅').then().catch(reactionCatchCallback);
        }
        return m.react('❌').then().catch(reactionCatchCallback);
      });

      Promise.all(promises).then(() => {
        message.channel.send('Done.');
      });
    });
  },
};
