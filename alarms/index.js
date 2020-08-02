const { CronJob } = require('cron');
const sendLogMessage = require('../utils/sendLogMessage');
const Schedule = require('../db/models/scheduled_messages');
const Config = require('../db/models/config');
const config = require('../config.js');

/* eslint-disable no-unused-vars,no-console */
const timer = (client, targetDate, callback) => {
  const now = new Date();
  const target = targetDate;
  // console.log(target, now);
  if (target <= now) {
    callback(client);
    return;
  }

  // console.log('tick');
  setTimeout(timer, 1000, client, targetDate, callback); // tick every second
};

const setAlarm = (client, date, callback) => {
  const now = new Date();
  const target = date;
  console.log('setAlarm', target, now);
  if (target > now) {
    timer(client, date, callback);
  } else {
    console.log('target < now');
  }
};

// callbacks

const openSignups = (client, SERVER_ID) => {
  console.log('openSignups');
  const guild = client.guilds.cache.get(SERVER_ID);
  const channel = guild.channels.cache.find((c) => c.name === 'signups');
  channel.createOverwrite(channel.guild.roles.everyone, { SEND_MESSAGES: true }).then(() => {
    sendLogMessage(guild, `Changed permission in channel${channel} for everyone SEND_MESSAGES: true`);
    channel.send(client.parseSignup.prototype.template)
      .then((msg) => {
        msg.pin().then(() => {
          const filter = channel.messages.cache.filter((m) => m.type === 'PINS_ADD' && m.author.id === client.user.id);
          filter.last().delete();
        });
      })
      .catch(console.error);
  }).catch((error) => {
    sendLogMessage(guild, error.toString());
  });
};

const closeSignups = (client, SERVER_ID) => {
  console.log('closeSignups');
  const guild = client.guilds.cache.get(SERVER_ID);
  const channel = guild.channels.cache.find((c) => c.name === 'signups');
  channel.send('Signups are now closed!').catch(console.error);
  channel.createOverwrite(channel.guild.roles.everyone, { SEND_MESSAGES: false }).then().catch(console.error);
};

const sendScheduledMessage = (client, scheduledMessage) => {
  const channel = client.channels.cache.get(scheduledMessage.channel);
  if (!channel) {
    // eslint-disable-next-line no-underscore-dangle
    console.error(`Scheduled message${scheduledMessage._id} error: no channel.`);
    return;
  }
  let { message } = scheduledMessage;
  message = message.replace('{everyone}', '@everyone').replace('{here}', '@here');

  channel.send(message).then((sentMessage) => {

  });
};

const areDatesEqualsToMinutes = (date, now) => date.getUTCFullYear() === now.getUTCFullYear()
    && date.getUTCMonth() === now.getUTCMonth()
    && date.getUTCDate() === now.getUTCDate()
    && date.getUTCHours() === now.getUTCHours()
    && date.getUTCMinutes() === now.getUTCMinutes();

// scheduled messages
const scheduler = async (client) => {
  // console.log('tick scheduler');
  const now = new Date();
  await Schedule.find({ sent: false }).then((docs) => {
    docs.forEach((doc) => {
      const { date } = doc;
      if (areDatesEqualsToMinutes(date, now)) {
        // eslint-disable-next-line no-param-reassign
        doc.sent = true;
        doc.save();
        sendScheduledMessage(client, doc);
      }

      // console.log(moment(date).diff(now, 'minutes'));
    });
  });

  const server = process.env.TEST ? config.test_guild : config.main_guild;
  await Config.findOne({ name: 'signups_schedule' }).then((doc) => {
    ['open', 'close'].forEach((type) => {
      const date = doc.value[type];
      if (date && areDatesEqualsToMinutes(date, now)) {
        // eslint-disable-next-line no-param-reassign
        doc.value[type] = null;
        doc.markModified('value');
        doc.save(); // todo change and add guild_id

        if (type === 'open') {
          openSignups(client, server);
        } else {
          closeSignups(client, server);
        }
      }
    });
  });
};

// alarms
const alarms = (client) => {
  // scheduler(client);

  new CronJob('* * * * *', () => {
    scheduler(client);
  }).start();
};

module.exports = alarms;
