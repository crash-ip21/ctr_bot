const findMember = require('../utils/findMember');

module.exports = {
  name: 'find',
  description: 'Find member by tag.',
  args: false,
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  execute(message, args) {
    findMember(message.guild, args[0]).then((m) => {
      if (m) {
        message.channel.send(m.toString());
      } else {
        message.channel.send('Not found');
      }
    });
    return;

    let rows = message.content.split('\n');
    rows = rows.slice(1);

    const out = rows.map((tag) => {
      const member = message.guild.members.cache.find((m) => m.user.tag === tag);

      // if (!member) {
      //   const discriminator = tag.split('#').pop();
      //   const members = message.guild.members.cache.filter((m) => m.user.discriminator === discriminator);
      //   if (members.size === 1) {
      //     member = members[0];
      //   }
      // }

      if (member) {
        console.log(tag, `\`${member.user.id}\` \`${member.user.tag}\``);
      }
      if (!member) {
        return `Couldn't find \`${tag}\``;
      }
      return `Found \`${member.user.id}\` \`${member.user.tag}\``;
    });

    console.log(out);
    message.channel.send(out.join('\n'));
  },
};
