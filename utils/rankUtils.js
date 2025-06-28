const ranks = [
    "Tân Binh",
    "Huyết Binh",
    "Sát Thủ Đen",
    "Rồng Đen",
    "Quán Quân",
    "Thần Chiến Tranh",
    "Á Thần"
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
