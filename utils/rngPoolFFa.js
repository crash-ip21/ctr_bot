const axios = require('axios');
const { itemPools, itemlessPools } = require('./pools');

async function rngPoolFFa(items = true, fromPools = true) {
  let pools;
  let N;
  if (items) {
    N = 8;
    pools = itemPools;
  } else {
    N = 5;
    pools = itemlessPools;
  }

  if (!fromPools) {
    pools = [pools.flat()];
  }

  const poolSize = pools.flat().length;
  const poolSlice = N / pools.length;

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

  maps = maps.map((m) => {
    if (m === 'Turbo Track' && Math.random() > 0.5) {
      m = 'Retro Stadium';
    }
    return m;
  });

  return maps;
  // });
}

module.exports = rngPoolFFa;
