const ranks = [
    "Kombatant",
    "Blood Warrior",
    "Shadow Ninja",
    "Black Dragon",
    "Elder Champion",
    "God of War",
    "Elder God"
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
        5: {
            "3-0": [40, 35],
            "3-1": [30, 25],
            "3-2": [25, 20]
        },
        7: {
            "4-0": [70, 65],
            "4-1": [55, 50],
            "4-2": [40, 35],
            "4-3": [35, 30]
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
