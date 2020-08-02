const rngPoolFFa = require('../utils/rngPoolFFa');

module.exports = {
  name: 'rng_ffa',
  description: 'Picks 8 random tracks from 3 pools for FFA',
  guildOnly: true,
  aliases: ['rng_mogi'],
  cooldown: 10,
  execute(message, args) {
    return message.channel.send(`Select lobby mode. Waiting 1 minute.
0 - Itemless (pools)
1 - Items (pools)
2 - Itemless (full rng)
3 - Items (full rng)`).then((confirmMessage) => {
      message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
        .then((collected) => {
          const collectedMessage = collected.first();
          const { content } = collectedMessage;
          collectedMessage.delete();
          if (['0', '1', '2', '3'].includes(content)) {
            confirmMessage.edit('Randomizing...').then((m) => {
              const items = content === '1' || content === '3';
              const fromPools = content === '0' || content === '1';
              const title = `Tracks for ${(items ? 'item' : 'itemless')} lobby ${fromPools ? '(pools)' : '(full rng)'}`;
              rngPoolFFa(items, fromPools).then((maps) => {
                m.edit(`**${title}**\n\`${maps.join('\n')}\``);
              });
            });
          } else {
            throw new Error('cancel');
          }
        })
        .catch(() => confirmMessage.edit('Command cancelled.'));
    });
  },
};
