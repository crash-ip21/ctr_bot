module.exports = {
  name: 'purge',
  description: 'Delete last N messages in current channel.',
  guildOnly: true,
  permissions: ['MANAGE_MESSAGES'],
  args: true,
  usage: 'purge [N]',
  execute(message, args) {
    const limit = parseInt(args[0], 10);

    const LIMIT = 50;
    if (limit > LIMIT) {
      message.channel.send(`Too much. Limit is ${LIMIT}.`);
      return;
    }

    const { channel } = message;

    channel.messages.fetch({
      before: message.id,
      limit,
    }).then((messages) => {
      const deletedCallback = () => {
        message.delete();
      };
      channel.bulkDelete(messages)
        .then(deletedCallback)
        .catch((error) => {
          message.channel.send(`${error.toString()}\nDeleting one by one now instead. Might take a while...`).then((deletingMessage) => {
            const deletePromises = messages.map((m) => m.delete());
            Promise.all(deletePromises).then(deletedCallback).then(() => deletingMessage.delete());
          });
        });
    });
  },
};
