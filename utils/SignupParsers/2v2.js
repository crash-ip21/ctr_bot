module.exports = {
  fields: [
    {
      key: /team ?name/i,
      name: 'teamName',
      type: 'plain',
    },
    {
      key: /psn ?1/i,
      name: 'psn1',
      type: 'plain',
    },
    {
      key: /psn ?2/i,
      name: 'psn2',
      type: 'plain',
    },
    {
      key: /discord ?1/i,
      name: 'discord1',
      type: 'mention',
    },
    {
      key: /discord ?2/i,
      name: 'discord2',
      type: 'mention',
    },
    {
      key: /host/i,
      name: 'host',
      type: 'boolean',
    },
  ],
  template: `Team Name: Template Team
PSN 1: ctr_tourney_bot
PSN 2: ctr_tourney_bot_2
Discord 1: <@635410532786110464>
Discord 2: <@635410532786110464>
Host: yes`,
};
