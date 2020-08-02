module.exports = {
  name: 'ping_me',
  description: 'ping_me',
  noHelp: true,
  execute(message) {
    message.channel.send(message.author.tag).then((m) => {
      m.edit(message.author.toString()).then();
    });
  },
};
