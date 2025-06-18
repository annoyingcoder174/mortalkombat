const fs = require('fs');
const path = require('path');

const fighters = require('./utils/fighters.json'); // ✅ Correct relative path

const updatedFighters = fighters.map(champ => ({
    ...champ,
    totalPicks: 0,
    totalBans: 0,
    totalWins: 0,
    totalGames: 0
}));

fs.writeFileSync(
    path.join(__dirname, 'utils', 'fighters_with_stats.json'), // Save back into /utils
    JSON.stringify(updatedFighters, null, 2)
);

console.log('✅ Created utils/fighters_with_stats.json with stat fields.');
