function addRole(member, role) {
  const userTag = member.user.tag;
  if (!member.roles.cache.has(role.id)) {
    member.roles.add(role);
    return `Added role ${role} to \`${userTag}\``;
  }
  return `\`${userTag}\` already has a role ${role}`;
}

module.exports = {
  name: 'role_participant',
  description: 'Add role to members.',
  args: true,
  usage: '<role> [remove]\n<users>',
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  async execute(message, args) {
    const roleName = args.join(' ');

    const { guild: server } = message;
    const role = server.roles.cache.find((r) => r.name === roleName);
    let participantRole = server.roles.cache.find((r) => r.name === 'Participant');
    if (!participantRole) {
      participantRole = await server.roles.create({ data: { name: 'Participant', mentionable: true }, reason: 'imagine not having "Participant" role smh' });
    }

    if (!role) {
      return message.reply(`role ${roleName} not found!`);
    }

    let rows = message.content.split('\n');
    rows = rows.slice(1);

    server.members.fetch().then((guild) => {
      const { members } = guild;
      const out = rows.map((userTag) => {
        const member = members.find((m) => m.user.tag === userTag);

        if (!member) {
          return `Couldn't find \`${userTag}\``;
        }

        const addRole1 = addRole(member, participantRole);
        const addRole2 = addRole(member, role);
        return `${addRole1}\n${addRole2}`;
      });
      return message.channel.send(out.join('\n'));
    });
  },
};
