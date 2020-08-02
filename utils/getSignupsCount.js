const fetchMessages = require('./fetchMessages');

const getSignupsCount = async (channel) => fetchMessages(channel, 500).then((messages) => {
  const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  let count = 0;
  sortedMessages.forEach((m, index) => {
    if (index === 0) return; // ignore first message

    if (m.type === 'PINS_ADD' || m.author.bot) {
      return;
    }

    count += 1;
  });

  return count;
});

module.exports = getSignupsCount;
