const {
  _4V4, BATTLE, DUOS, ITEMLESS, ITEMS,
} = require('../db/models/ranked_lobbies');

/**
 * Returns a player's superscore
 * @param rank
 * @returns {number}
 */
function calculateSuperScore(rank) {
  const baseRank = 500;

  const itemsRank = rank[ITEMS].rank || baseRank;
  const itemlessRank = rank[ITEMLESS].rank || baseRank;
  const duosRank = rank[DUOS].rank || baseRank;
  const battleRank = rank[BATTLE].rank || baseRank;
  const _4v4Rank = rank[_4V4].rank || baseRank;

  return Math.floor((itemsRank * 0.1) + (itemlessRank * 0.3) + (duosRank * 0.2) + (battleRank * 0.05) + (_4v4Rank * 0.4));
}

module.exports = calculateSuperScore;
