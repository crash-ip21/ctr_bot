module.exports = {
  name: 'stop',
  description: 'STOP',
  noHelp: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    if (!(message.member && message.member.roles.cache.find((r) => r.name === 'Admin')) && message.author.id !== config.owner) {
      const adminRole = message.guild.roles.cache.find((r) => r.name === 'Admin');
      return message.reply(`you should have a role ${adminRole} to use this command!`);
    }

    // eslint-disable-next-line no-param-reassign
    message.client.stop = true;
    return message.reply('you stopped me :slight_frown:');
  },
};
