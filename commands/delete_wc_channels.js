module.exports = {
  name: 'delete_wc_channels',
  description: 'delete_wc_channels',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  noHelp: true,
  async execute(message, args) {
    return;
    const { guild } = message;

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

    guild.channels.cache.forEach((c) => {
      if (countries.find((name) => c.name.replace(/-/g, ' ').includes(name.toLowerCase()))) {
        c.delete();
      }
    });

    guild.roles.cache.forEach((r) => {
      if (countries.find((name) => r.name.includes(name))) {
        r.delete();
      }
    });
  },
};
