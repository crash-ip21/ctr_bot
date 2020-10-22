module.exports = {
  fields: [
    {
      key: /psn/i,
      name: 'psn',
      type: 'plain',
    },
    {
      key: /country/i,
      name: 'country',
      type: 'flag',
    },
  ],
  template: `PSN: ctr_tourney_bot
country: 🌐`,
};
