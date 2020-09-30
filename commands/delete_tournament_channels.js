const Discord = require('discord.js');
const bot = require('../bot');

module.exports = {
  name: 'delete_tournament_channels',
  description: 'Delete tournament channels and roles.',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    if (!(message.member && message.member.roles.cache.find((r) => r.name === 'Admin'))) {
      const adminRole = message.guild.roles.cache.find((r) => r.name === 'Admin');
      return message.reply(`you should have a role ${adminRole} to use this command!`);
    }

    const { confirmations } = bot;

    const authorId = message.author.id;
    if (!confirmations.has(authorId)) {
      confirmations.set(authorId, new Discord.Collection());
    }

    const userConfirmation = confirmations.get(authorId);
    const autoCancelSeconds = 10;

    const confirmationCommand = userConfirmation.get('command');
    if (confirmationCommand) {
      return message.reply(`you need to confirm or cancel your previous command: ${confirmationCommand}`);
    }

    message.reply(`this command will delete all channels in \`Tournament Lobbies\` category and all roles with the same names!
Say \`!confirm\` to proceed, \`!cancel\` to cancel.
Command will be automatically cancelled after ${autoCancelSeconds} seconds.`);
    const commandName = 'delete_tournament_channels';
    userConfirmation.set('command', commandName);

    return setTimeout(() => {
      if (userConfirmation.get('command')) {
        userConfirmation.delete('command');
        return message.reply(`command \`${commandName}\` cancelled!`);
      }
      return null;
    }, autoCancelSeconds * 1000);
  },
  async confirm(message) {
    message.channel.send('Processing...').then(async (botMsg) => {
      const channels = message.guild.channels.cache.filter((c) => c.parent && c.parent.name === 'Tournament Lobbies');

      const outMessageRows = [];

      /** couldn't use await in iterable callback functions,
       * so using standard loops
       */

      // eslint-disable-next-line no-restricted-syntax
      for (const c of channels.array()) {
        try {
        // eslint-disable-next-line no-await-in-loop
          await c.delete();
          outMessageRows.push(`Removed channel #${c.name}`);

          const roles = message.guild.roles.cache.filter((r) => r.name === c.name);

          // eslint-disable-next-line no-restricted-syntax
          for (const r of roles.array()) {
            try {
            // eslint-disable-next-line no-await-in-loop
              await r.delete();
              outMessageRows.push(`Removed role @${c.name}`);
            } catch (e) {
              message.channel.send(`\`${e.name}: ${e.message}\``);
              break;
            }
          }
        } catch (e) {
          message.channel.send(`\`${e.name}: ${e.message}\``);
          break;
        }
      }

      if (outMessageRows.length) {
        await botMsg.edit(outMessageRows.join('\n'));
      } else {
        await botMsg.edit('I think there is nothing to delete :slight_smile:');
      }
    });
  },
};
