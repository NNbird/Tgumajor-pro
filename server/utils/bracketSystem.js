// server/utils/bracketSystem.js

/**
 * 生成单败淘汰赛对阵 (8支队伍)
 * 规则：
 * Round 1 (8强/Quarter): 1-8, 4-5, 3-6, 2-7
 * Round 2 (4强/Semi): Q1胜 vs Q2胜, Q3胜 vs Q4胜
 * Round 3 (决赛/Final): S1胜 vs S2胜
 */
export function generateBracketPairings(teams, previousMatches, currentRound) {
    const newMatches = [];

    // --- Round 1: 8强赛 (Quarter-Finals) ---
    // 此时还没有上一轮，基于种子排名生成
    if (currentRound === 1) { 
        // 按种子排序 (1-8)
        const sorted = [...teams].sort((a, b) => a.seed - b.seed);
        if(sorted.length < 8) return { newMatches: [] }; // 保护

        // 固定对阵结构 (High-Low for Bracket)
        const pairings = [
            { group: 'Q1', teamA: sorted[0], teamB: sorted[7] }, // 1 vs 8
            { group: 'Q2', teamA: sorted[3], teamB: sorted[4] }, // 4 vs 5
            { group: 'Q3', teamA: sorted[2], teamB: sorted[5] }, // 3 vs 6
            { group: 'Q4', teamA: sorted[1], teamB: sorted[6] }, // 2 vs 7
        ];

        pairings.forEach(p => {
            newMatches.push({
                round: 1,
                matchGroup: p.group,
                teamAId: p.teamA.id,
                teamBId: p.teamB.id,
                isBo3: true, // 淘汰赛默认 BO3
                isFinished: false
            });
        });
    }

    // --- Round 2: 半决赛 (Semi-Finals) ---
    // 依赖 Round 1 的胜者
    else if (currentRound === 2) { 
        const q1Winner = findWinner(previousMatches, 'Q1');
        const q2Winner = findWinner(previousMatches, 'Q2');
        const q3Winner = findWinner(previousMatches, 'Q3');
        const q4Winner = findWinner(previousMatches, 'Q4');

        // S1: Winner Q1 vs Winner Q2
        if (q1Winner && q2Winner) {
            newMatches.push(createMatch(2, 'S1', q1Winner, q2Winner));
        }
        // S2: Winner Q3 vs Winner Q4
        if (q3Winner && q4Winner) {
            newMatches.push(createMatch(2, 'S2', q3Winner, q4Winner));
        }
    }

    // --- Round 3: 决赛 (Grand Final) ---
    // 依赖 Round 2 的胜者
    else if (currentRound === 3) {
        const s1Winner = findWinner(previousMatches, 'S1');
        const s2Winner = findWinner(previousMatches, 'S2');

        if (s1Winner && s2Winner) {
            newMatches.push(createMatch(3, 'F1', s1Winner, s2Winner));
        }
    }

    return { newMatches };
}

// 辅助：根据 matchGroup 查找历史比赛的胜者ID
function findWinner(matches, group) {
    const m = matches.find(m => m.matchGroup === group);
    // 必须是已结束且有胜者的
    return m && m.isFinished ? m.winnerId : null;
}

function createMatch(round, group, teamAId, teamBId) {
    return {
        round,
        matchGroup: group,
        teamAId,
        teamBId,
        isBo3: true, // 半决赛和决赛通常 BO3 (或BO5，此处统一BO3)
        isFinished: false
    };
}