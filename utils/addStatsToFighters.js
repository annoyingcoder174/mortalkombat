const fs = require('fs');
const path = require('path');

const raw = require('./fighters.json');

const updated = raw.map(champ => ({
    ...champ,
    totalPicks: 0,
    totalBans: 0,
    totalWins: 0,
    totalGames: 0
}));

fs.writeFileSync(path.join(__dirname, 'fighters_with_stats.json'), JSON.stringify(updated, null, 2));

console.log('✅ Generated fighters_with_stats.json with stat fields.');
