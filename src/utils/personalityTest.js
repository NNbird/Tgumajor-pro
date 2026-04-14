export function calculateResult(userScores, players) {
  // Clamp scores to 0-100
  const clampedScores = {
    AGG: Math.max(0, Math.min(100, userScores.AGG)),
    TEA: Math.max(0, Math.min(100, userScores.TEA)),
    INS: Math.max(0, Math.min(100, userScores.INS)),
    VOC: Math.max(0, Math.min(100, userScores.VOC)),
    SPE: Math.max(0, Math.min(100, userScores.SPE)),
  };

  const weights = {
    AGG: 1.0,
    TEA: 1.0,
    INS: 1.0,
    VOC: 1.0,
    SPE: 1.5,
  };

  const playerDistances = players.map(player => {
    const dAgg = Math.pow(clampedScores.AGG - player.AGG, 2) * weights.AGG;
    const dTea = Math.pow(clampedScores.TEA - player.TEA, 2) * weights.TEA;
    const dIns = Math.pow(clampedScores.INS - player.INS, 2) * weights.INS;
    const dVoc = Math.pow(clampedScores.VOC - player.VOC, 2) * weights.VOC;
    const dSpe = Math.pow(clampedScores.SPE - player.SPE, 2) * weights.SPE;

    const distance = Math.sqrt(dAgg + dTea + dIns + dVoc + dSpe);
    return { player, distance };
  });

  // Sort by distance and return top 4
  const sortedMatches = playerDistances
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4)
    .map(m => m.player);

  return { closestPlayer: sortedMatches[0], topMatches: sortedMatches };
}

export function generateAnalysis(userScores, player) {
  const diffs = [
    { dim: '战斗主动性(AGG)', diff: userScores.AGG - player.AGG },
    { dim: '资源分配(TEA)', diff: userScores.TEA - player.TEA },
    { dim: '认知处理(INS)', diff: userScores.INS - player.INS },
    { dim: '沟通机制(VOC)', diff: userScores.VOC - player.VOC },
    { dim: '战术流动性(SPE)', diff: userScores.SPE - player.SPE },
  ];

  // Find the biggest difference
  diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const biggestDiff = diffs[0];

  let analysis = `您的神经通路完美映射了巨星 ${player.name}。`;
  
  if (Math.abs(biggestDiff.diff) > 10) {
    const direction = biggestDiff.diff > 0 ? '高出' : '低于';
    analysis += `你们同样具备在极端英雄主义与团队大局观之间切换的天赋，但在${biggestDiff.dim}上您要比他${direction}${Math.abs(biggestDiff.diff)}个百分点。`;
  } else {
    analysis += `你们在各个维度的战术心理特征上都惊人地一致，简直是他在平行宇宙的完美倒影。`;
  }

  return analysis;
}
