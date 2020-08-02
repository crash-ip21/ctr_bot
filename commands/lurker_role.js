module.exports = {
  name: 'lurker',
  description: 'lurker',
  guildOnly: true,
  noHelp: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    return;
    const lurkerRole = message.guild.roles.cache.find((r) => r.name === 'lurker');

    const channels = [
      'war-search',
      'private-lobbies',
      'ranked-announcements',
      'results-items',
      'results-itemless',
      'results-submissions',
      'results-general',
      'results-room-1',
      'results-room-2',
      'results-room-3',
      'results-room-4',
      'results-room-5',
      'results-room-6',
    ];

    message.guild.channels.cache.forEach((c) => {
      if (channels.includes(c.name)) {
        c.createOverwrite(lurkerRole, { VIEW_CHANNEL: true });
      }
    });
  },
};
