const ranks = [
    "Tân Binh",           // 0–399
    "Huyết Binh",         // 400–799
    "Sát Thủ Đen",        // 800–1199
    "Rồng Đen",           // 1200–1599
    "Quán Quân",          // 1600–1999
    "Thần Chiến Tranh",  // 2000–2399
    "Á Thần"              // 2400+
];

function getRank(elo) {
    const tier = Math.floor(elo / 100);
    const rankIndex = Math.min(Math.floor(tier / 4), ranks.length - 1);
    const division = rankIndex === ranks.length - 1 ? 1 : 4 - (tier % 4);
    const name = ranks[rankIndex];
    return `${name} ${division}`;
}

function calculateEloGain(format, winnerScore, loserScore) {
    const table = {
        3: {
            "2-0": [30, 25],
            "2-1": [25, 20]
        },
        5: {
            "3-0": [50, 40],
            "3-1": [40, 30],
            "3-2": [30, 25]
        },
        7: {
            "4-0": [90, 75],
            "4-1": [70, 55],
            "4-2": [50, 35],
            "4-3": [30, 25]
        },
        9: {
            "5-0": [150, 120],
            "5-1": [120, 100],
            "5-2": [95, 80],
            "5-3": [75, 60],
            "5-4": [55, 40]
        }
    };

    const key = `${winnerScore}-${loserScore}`;
    const result = table[format]?.[key];
    return {
        gain: result?.[0] || 0,
        loss: result?.[1] || 0
    };
}

module.exports = {
    getRank,
    calculateEloGain
};
