module.exports = {
  name: 'bans',
  description: 'bans',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    message.guild.fetchBans()
      .then((banned) => {
        const list = banned.map((ban) => {
          const { user } = ban;
          return `${user.id},${user.tag},${ban.reason}`;
        }).join('\n');

        message.channel.send(`**${banned.size} users are banned:**\n\`\`\`${list}\`\`\``);
      })
      .catch(console.error);
  },
};
