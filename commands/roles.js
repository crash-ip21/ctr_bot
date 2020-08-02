module.exports = {
  name: 'roles',
  description: 'roles',
  noHelp: true,
  guildOnly: true,
  execute(message, args) {
    const roles = message.guild.roles.cache.map((r) => r.name).join('\n');
    message.channel.send(roles);
  },
};
