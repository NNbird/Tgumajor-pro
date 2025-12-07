// server/utils/swissSystem.js

/**
 * 计算 BU 分 (Buchholz Score)
 * BU 分 = 所有已交手过的对手的 (胜场 - 负场) 之和
 */
export function calculateBuchholz(teams, matches) {
    const teamStats = {}; // id -> { wins, losses, opponents: [] }

    // 1. 初始化映射
    teams.forEach(t => {
        teamStats[t.id] = { 
            id: t.id, 
            wins: t.wins, 
            losses: t.losses, 
            seed: t.seed,
            buchholz: 0,
            opponents: new Set() // 使用 Set 加速查找
        };
    });

    // 2. 遍历历史比赛，记录对手
    matches.forEach(m => {
        // 只要产生了对阵记录，就算作对手（防止同一阶段重复打）
        if (m.teamAId && m.teamBId) {
            if (teamStats[m.teamAId]) teamStats[m.teamAId].opponents.add(m.teamBId);
            if (teamStats[m.teamBId]) teamStats[m.teamBId].opponents.add(m.teamAId);
        }
    });

    // 3. 计算 BU 分
    for (const teamId in teamStats) {
        const currentTeam = teamStats[teamId];
        currentTeam.opponents.forEach(oppId => {
            const opp = teamStats[oppId];
            if (opp) {
                // BU 分 = 对手净胜场 (Wins - Losses)
                currentTeam.buchholz += (opp.wins - opp.losses);
            }
        });
    }

    return teamStats; // 返回带最新 BU 分的 map
}

/**
 * 递归寻找不重复对阵的最优解 (High-Low 模式)
 * @param {Array} pool - 当前分组内待配对的战队列表 (已按 Rank 排序)
 * @param {Object} statsMap - 包含历史对手信息的 Map
 * @returns {Array} 配对结果 [{teamA, teamB}, ...] 或 null
 */
function getValidPairings(pool, statsMap) {
    if (pool.length === 0) return []; // 配对完成

    // 取出当前排名最高的队伍 (High Seed)
    const highTeam = pool[0];
    const highStats = statsMap[highTeam.id];

    // 从最低排名的队伍开始尝试匹配 (High vs Low)
    // i 从最后一名开始向前遍历
    for (let i = pool.length - 1; i >= 1; i--) {
        const lowTeam = pool[i];

        // 检查是否已对阵过
        if (!highStats.opponents.has(lowTeam.id)) {
            // 尝试匹配这两队
            const currentPair = { teamA: highTeam, teamB: lowTeam };
            
            // 剩下的队伍组成新池子
            const remainingPool = pool.filter((_, idx) => idx !== 0 && idx !== i);
            
            // 递归尝试匹配剩下的队伍
            const remainingPairings = getValidPairings(remainingPool, statsMap);
            
            // 如果剩下的队伍也能完美匹配，则找到解
            if (remainingPairings !== null) {
                return [currentPair, ...remainingPairings];
            }
            // 否则（死局），回溯，尝试下一个 lowTeam（顺推一位）
        }
    }

    // 如果遍历完所有人都找不到合法对手，或者会导致后续死局，返回 null (回溯)
    return null;
}

/**
 * 生成瑞士轮下一轮对阵
 * @param {Array} teams - 包含最新 wins, losses, seed 的战队数组
 * @param {Array} previousMatches - 历史比赛记录
 * @param {Int} nextRoundNum - 下一轮是第几轮 (1-5)
 */
export function generateSwissPairings(teams, previousMatches, nextRoundNum) {
    // 1. 计算 BU 分并更新 teams 数组
    const statsMap = calculateBuchholz(teams, previousMatches);
    const updatedTeams = teams.map(t => ({
        ...t,
        buchholz: statsMap[t.id]?.buchholz || 0
    }));

    // 2. 过滤掉已淘汰或已晋级的队伍 (只保留 ALIVE)
    const aliveTeams = updatedTeams.filter(t => t.status === 'ALIVE');

    // 3. 按战绩分组 (例如 "1-0", "0-1", "2-1"...)
    const pools = {};
    aliveTeams.forEach(t => {
        const record = `${t.wins}-${t.losses}`;
        if (!pools[record]) pools[record] = [];
        pools[record].push(t);
    });

    const newMatches = [];

    // 4. 遍历每个分组进行配对
    // 分组顺序：高分段先配
    const poolKeys = Object.keys(pools).sort((a, b) => {
        const [w1, l1] = a.split('-').map(Number);
        const [w2, l2] = b.split('-').map(Number);
        return (w2 - l2) - (w1 - l1); 
    });

    for (const key of poolKeys) {
        let groupTeams = pools[key];

        // --- 排序逻辑 ---
        // Round 1 & 2: 严格按初始种子排序 (Seed 1 vs Seed 16)
        // Round 3+: 先看 BU 分 (高->低)，再看种子 (高->低)
        groupTeams.sort((a, b) => {
            if (nextRoundNum >= 3) {
                if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
            }
            return a.seed - b.seed; // 种子号越小，排名越高
        });

        // --- 配对逻辑 ---
        
        // 模式 A: Round 1 (Split Seeding: 1 vs 9, 2 vs 10...)
        if (nextRoundNum === 1) {
            const count = groupTeams.length;
            const half = Math.floor(count / 2);
            for (let i = 0; i < half; i++) {
                createMatch(groupTeams[i], groupTeams[i + half], key);
            }
        } 
        
        // 模式 B: Round 2+ (High-Low Seeding with History Check)
        // 1 vs 16 (如果打过则 1 vs 15...)
        else {
            // 使用回溯算法寻找最优解
            const pairings = getValidPairings(groupTeams, statsMap);

            if (pairings) {
                pairings.forEach(p => createMatch(p.teamA, p.teamB, key));
            } else {
                // [兜底] 极罕见情况（死局），回退到强制 High-Low（即使重复）以防系统崩溃
                // 实际 Major 会交换种子顺序，这里简化处理
                console.warn(`Round ${nextRoundNum} Group ${key}: 无法规避重复对阵，执行强制配对`);
                const count = groupTeams.length;
                const half = Math.floor(count / 2);
                for (let i = 0; i < half; i++) {
                    // 强制 High-Low: 1 vs Last, 2 vs Last-1
                    createMatch(groupTeams[i], groupTeams[count - 1 - i], key);
                }
            }
        }
    }

    // 辅助函数：创建比赛对象
    function createMatch(teamA, teamB, groupKey) {
        // 判断 BO3: 涉及晋级 (2胜) 或 淘汰 (2负)
        const isPromotion = teamA.wins === 2;
        const isElimination = teamA.losses === 2;
        const isBo3 = isPromotion || isElimination;

        newMatches.push({
            eventId: teamA.eventId,
            round: nextRoundNum,
            matchGroup: groupKey,
            teamAId: teamA.id,
            teamBId: teamB.id,
            isBo3: isBo3,
            isFinished: false
        });
    }

    return { newMatches, updatedStats: statsMap };
}