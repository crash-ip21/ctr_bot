module.exports = {
  name: 'leave',
  description: 'leave',
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    message.guild.me.voice.channel.leave();
  },
};
