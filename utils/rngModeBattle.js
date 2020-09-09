const axios = require('axios');
const { battleModes }  = require('./modes_battle');

async function rngModeBattle() {
  let modes = battleModes;
  let N = 5;

  const modesSize = modes.flat().length;
  const modeSlice = 2;

  if (!Number.isInteger(modeSlice)) {
    throw Error('Something is wrong with pools');
  }

  const randomFractionsNumber = modesSize + N;

  const rng = Array(randomFractionsNumber).fill(0).map(() => Math.random());

  let maps = [];

  modes.forEach((mode, i) => {
    const sliceRng = rng.splice(0, mode.length);

    const randomizedMode = mode.map((p, i) => {
      const rngNumber = sliceRng[i];
      return [p, rngNumber];
    })
      .sort((a, b) => a[1] - b[1])
      .map((p) => p[0]);

    const slice = randomizedMode.slice(0, modeSlice);
    maps.push(...slice);
  });

  const sliceRng = rng.splice(0, maps.length);

  maps = maps.map((p, i) => {
    const rngNumber = sliceRng[i];
    return [p, rngNumber];
  })
    .sort((a, b) => a[1] - b[1])
    .map((p) => p[0]);

  return maps;
}

module.exports = rngModeBattle;
