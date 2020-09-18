const axios = require('axios');
const { battlePools }  = require('./pools_battle');

async function rngPoolBattle(fromPools = true) {
  let pools = battlePools;
  let N = 5;

  if (!fromPools) {
    pools = [pools.flat()];
  }

  const poolSize = pools.flat().length;
  const poolSlice = 2;

  if (!Number.isInteger(poolSlice)) {
    throw Error('Something is wrong with pools');
  }

  const randomFractionsNumber = poolSize + N;

  const rng = Array(randomFractionsNumber).fill(0).map(() => Math.random());

  let maps = [];

  pools.forEach((pool, i) => {
    const sliceRng = rng.splice(0, pool.length);

    const randomizedPool = pool.map((p, i) => {
      const rngNumber = sliceRng[i];
      return [p, rngNumber];
    })
      .sort((a, b) => a[1] - b[1])
      .map((p) => p[0]);

    const slice = randomizedPool.slice(0, poolSlice);
    maps.push(...slice);
  });

  const sliceRng = rng.splice(0, maps.length);

  maps = maps.map((p, i) => {
    const rngNumber = sliceRng[i];
    return [p, rngNumber];
  })
    .sort((a, b) => a[1] - b[1])
    .map((p) => p[0]);

  maps.pop();

  return maps;
}

module.exports = rngPoolBattle;
