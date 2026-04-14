import { calculateBuchholz } from './swissSystem.js';

/**
 * 16队双败制 (3轮快排) 算法
 * 逻辑：2胜晋级，2负淘汰
 */

/**
 * 辅助函数：根据排名 (Rank) 寻找 High vs Low 对阵
 */
function getRankPairings(pool) {
    if (pool.length === 0) return [];
    
    // pool 已经按 Rank (BU分/种子) 排序
    const pairings = [];
    const half = pool.length / 2;
    
    for (let i = 0; i < half; i++) {
        pairings.push({
            teamA: pool[i],
            teamB: pool[pool.length - 1 - i] // High vs Low
        });
    }
    return pairings;
}

export function generateDoubleElim16Pairings(teams, previousMatches, nextRoundNum) {
    let newMatches = [];
    
    // 1. 计算 BU 分
    const statsMap = calculateBuchholz(teams, previousMatches);
    const updatedTeams = teams.map(t => ({
        ...t,
        buchholz: statsMap[t.id]?.buchholz || 0
    }));

    // 根据当前胜负记录分组
    const group1_0 = updatedTeams.filter(t => t.wins === 1 && t.losses === 0 && t.status === 'ALIVE');
    const group0_1 = updatedTeams.filter(t => t.wins === 0 && t.losses === 1 && t.status === 'ALIVE');
    const group1_1 = updatedTeams.filter(t => t.wins === 1 && t.losses === 1 && t.status === 'ALIVE');

    // 排序逻辑
    const sortBySeed = (a, b) => a.seed - b.seed;
    
    // 第三轮 1-1 组优先按 BU 分排序
    const sortByBuchholz = (a, b) => {
        if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
        return a.seed - b.seed;
    };

    if (nextRoundNum === 2) {
        // Round 2: 1-0 组和 0-1 组分别对阵 (此时 BU 分均为 0 或 无意义，按种子)
        const sorted1_0 = [...group1_0].sort(sortBySeed);
        const sorted0_1 = [...group0_1].sort(sortBySeed);

        const pairs1_0 = getRankPairings(sorted1_0);
        const pairs0_1 = getRankPairings(sorted0_1);

        pairs1_0.forEach(p => {
            newMatches.push({
                round: 2, matchGroup: '1-0',
                teamAId: p.teamA.id, teamBId: p.teamB.id,
                isBo3: true, isFinished: false
            });
        });

        pairs0_1.forEach(p => {
            newMatches.push({
                round: 2, matchGroup: '0-1',
                teamAId: p.teamA.id, teamBId: p.teamB.id,
                isBo3: true, isFinished: false
            });
        });
    } 
    else if (nextRoundNum === 3) {
        // Round 3: 只有 1-1 组对阵 (生死战)，使用 BU 分进行 High-Low 匹配
        const sorted1_1 = [...group1_1].sort(sortByBuchholz);
        const pairs1_1 = getRankPairings(sorted1_1);

        pairs1_1.forEach(p => {
            newMatches.push({
                round: 3, matchGroup: '1-1',
                teamAId: p.teamA.id, teamBId: p.teamB.id,
                isBo3: true, isFinished: false
            });
        });
    }

    return { newMatches, updatedStats: statsMap }; 
}
