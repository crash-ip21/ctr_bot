module.exports = {
  name: 'role_list',
  description: 'List members with a role',
  args: true,
  usage: '<role>',
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  execute(message, args) {
    let role;
    if (message.mentions.roles.size) {
      role = message.mentions.roles.first();
    } else {
      const roleName = args.join(' ');
      role = message.guild.roles.cache.find((r) => r.name === roleName);
    }

    if (!role) {
      return message.reply('role was not found!');
    }

    let rows = message.content.split('\n');
    rows = rows.slice(1);

    message.guild.members.fetch().then((members) => {
      const out = [];
      members.forEach((m) => {
        if (m.roles.cache.has(role.id)) {
          out.push(`${m.toString()} ${m.user.tag}`);
        }
      });

      const outMessage = out.join('\n');
      if (outMessage.length <= 2000) {
        message.channel.send('...').then((msg) => msg.edit(outMessage));
      }
      return message.channel.send({
        files: [{
          attachment: Buffer.from(outMessage, 'utf-8'),
          name: 'role.txt',
        }],
      });
    });
  },
};
