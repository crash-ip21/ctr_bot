const config = require('../config.js');

const sendLogMessage = (guild, message, noPing = false) => {
  const logChannel = guild.channels.cache.find((c) => c.name === config.log_channel_name);
  if (logChannel) {
    if (noPing) {
      logChannel.send('...').then((m) => {
        m.edit(message).then().catch(console.error);
      });
    } else {
      logChannel.send(message);
    }
  } else {
    console.error(`CHANNEL NOT FOUND ${config.log_channel_name}!`);
    console.log(message);
  }
};
module.exports = sendLogMessage;
