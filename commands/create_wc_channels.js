module.exports = {
  name: 'create_wc_channels',
  description: 'Creating wc channels with roles.',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  async execute(message, args) {
    const { guild } = message;

    const c = guild.channels.cache.find((c) => c.name === 'World Cup Countries' && c.type === 'category');
    if (c) {
      return message.channel.send("I'm sure you don't want to do this again.");
    }

    const category = await guild.channels.create('World Cup Countries', { type: 'category' });

    const countries = [
      'Argentina',
      'Australia',
      'Belgium',
      'Bolivia',
      'Brazil',
      'Canada',
      'Chile',
      'Colombia',
      'Costa Rica',
      'Dominican Republic',
      'Ecuador',
      'Egypt',
      'El Salvador',
      'England',
      'Finland',
      'France',
      'Germany',
      'Hungary',
      'Ireland',
      'Italy',
      'Japan',
      'Kuwait',
      'Mexico',
      'Netherlands',
      'Peru',
      'Philippines',
      'Poland',
      'Puerto Rico',
      'Saudi Arabia',
      'Scotland',
      'Spain',
      'Sweden',
      'United Arab Emirates',
      'United States',
      'Uruguay',
    ];

    const outMessageRows = [];

    countries.forEach((name) => {
      // eslint-disable-next-line no-param-reassign
      outMessageRows.push(`Creating a role @${name}`);
      outMessageRows.push(`Creating a channel #${name}`);
      guild.roles.create({ data: { name } })
        .then((role) => {
          guild.channels.create(name, {
            type: 'text',
            parent: category,
          }).then(async (c) => {
            await c.createOverwrite(role, {
              VIEW_CHANNEL: true,
            });
            await c.createOverwrite(guild.roles.everyone, { VIEW_CHANNEL: false });
            await role.edit({ mentionable: true });
          }).catch((e) => {
            message.channel.send(`\`${e.name}: ${e.message}\``);
          });
        }).catch((e) => {
          message.channel.send(`\`${e.name}: ${e.message}\``);
        });
    });
    message.channel.send(outMessageRows.join('\n'));
  },
};
