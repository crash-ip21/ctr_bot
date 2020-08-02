module.exports = {
  name: 'remove_role_from_all',
  description: 'Remove role from all members.',
  args: true,
  usage: '<role>',
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  execute(message, args) {
    const roleName = args.join(' ');
    const role = message.guild.roles.cache.find((r) => r.name === roleName);

    function removeRole(member) {
      const userTag = member.user.tag;
      if (!member.roles.cache.some((r) => r.name === roleName)) {
        return `\`${userTag}\` doesn't have a role ${role}`;
      }
      member.roles.remove(role);
      return `Removed role ${role} fom \`${userTag}\``;
    }

    if (!role) {
      return message.reply(`role ${roleName} not found!`);
    }

    const out = role.members.map((m) => removeRole(m));

    if (out.length) {
      return message.channel.send(out.join('\n'));
    }
    return message.channel.send('Can\'t find any users with this role!');
  },
};
