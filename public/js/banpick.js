const socket = io();

const data = document.getElementById('banpick-data');
const user = data.dataset.user;
const roomId = data.dataset.room;
const isCreator = data.dataset.iscreator === 'true';
const format = parseInt(data.dataset.format);
const players = JSON.parse(data.dataset.players);

let phase = 'waiting';
let currentTurnUser = null;
let timerInterval = null;

window.banSources = {};
window.matchHistory = [];

socket.emit('join-room', { roomId, userId: user });

function startCountdown(seconds) {
    let remaining = seconds;
    const timerEl = document.getElementById('timer');
    timerEl.textContent = `${remaining}s`;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remaining--;
        timerEl.textContent = `${remaining}s`;
        if (remaining <= 0) {
            clearInterval(timerInterval);
            if (user === currentTurnUser && phase === 'ban') {
                autoBanRandom();
            }
        }
    }, 1000);
}

function autoBanRandom() {
    const available = Array.from(document.querySelectorAll('.champ-img:not(.disabled)'));
    const randomChamp = available[Math.floor(Math.random() * available.length)];
    if (randomChamp) {
        banChampion(randomChamp.dataset.id);
    }
}

function banChampion(champId) {
    socket.emit('ban-champ', { roomId, champId, userId: user });
}

function pickChampion(champId) {
    socket.emit('pick-champ', { roomId, champId, userId: user });
}

function appendToSlot(champId, targetId, result = null) {
    const champ = document.querySelector(`.champ-img[data-id="${champId}"]`);
    if (!champ) return;

    const clone = champ.cloneNode(true);
    clone.classList.remove('champ-img');
    clone.classList.add('img-thumbnail');
    clone.style.cursor = 'default';
    clone.style.width = '100%';
    clone.style.height = '100%';

    if (result === 'win') clone.classList.add('win-mark');
    if (result === 'lose') clone.classList.add('lose-mark');

    // Find the first empty slot in the target container
    const slotContainer = document.getElementById(targetId);
    const emptySlot = Array.from(slotContainer.children).find(child => child.children.length === 0);

    if (emptySlot) {
        emptySlot.appendChild(clone);
    }

    champ.classList.add('disabled');
}



function getPlayerLossCount(username) {
    if (!window.matchHistory) return 0;
    return window.matchHistory.filter(w => w !== username).length;
}

function unlockBannedChampsIfEligible() {
    const threshold = Math.ceil((format - 1) / 2);
    const losses = getPlayerLossCount(user);
    if (losses < threshold) return;

    const allBanned = document.querySelectorAll('.champ-img.disabled');
    allBanned.forEach(champ => {
        const champId = champ.dataset.id;
        const source = window.banSources?.[champId];
        if (source && source !== user) {
            champ.classList.remove('disabled');
            champ.classList.add('freed-champ');
            champ.style.outline = '2px solid yellow';
            champ.style.outlineOffset = '2px';
        }
    });
}

document.getElementById('champ-grid').addEventListener('click', (e) => {
    const target = e.target;
    if (!target.classList.contains('champ-img')) return;
    const champId = target.dataset.id;
    if (target.classList.contains('disabled')) return;
    if (user !== currentTurnUser) return;

    if (phase === 'ban') {
        banChampion(champId);
    } else if (phase === 'pick') {
        pickChampion(champId);
    }
});

if (isCreator) {
    document.getElementById('win-btn').onclick = () => {
        socket.emit('round-winner', {
            roomId,
            winnerId: user // creator clicked “I Win”
        });
    };

    document.getElementById('lose-btn').onclick = () => {
        const winner = players.find(p => p !== user); // joiner wins
        socket.emit('round-winner', {
            roomId,
            winnerId: winner
        });
    };
}


// --- Socket Events ---

socket.on('start-ban-phase', () => {
    phase = 'ban';
    document.getElementById('phase-indicator').textContent = 'Ban Phase';
});

socket.on('start-pick-phase', () => {
    phase = 'pick';
    document.getElementById('phase-indicator').textContent = 'Pick Phase';
});

socket.on('your-turn', ({ userId, phase: p }) => {
    currentTurnUser = userId;
    phase = p;
    document.getElementById('phase-indicator').textContent = `${p.toUpperCase()} - ${userId}'s turn`;

    if (userId === user) {
        startCountdown(30);
        if (p === 'pick') unlockBannedChampsIfEligible();
    } else {
        clearInterval(timerInterval);
        document.getElementById('timer').textContent = '--';
    }
});

socket.on('banned', ({ userId, champId }) => {
    const target = userId === user ? 'ban-you' : 'ban-opp';
    appendToSlot(champId, target);
});

socket.on('picked', ({ userId, champId }) => {
    const target = userId === user ? 'pick-you' : 'pick-opp';
    appendToSlot(champId, target);
});

socket.on('awaiting-winner', () => {
    phase = 'await';
    currentTurnUser = null;
    clearInterval(timerInterval);
    document.getElementById('phase-indicator').textContent = 'Awaiting result...';
});

socket.on('next-round', ({ round }) => {
    document.getElementById('phase-indicator').textContent = `Round ${round}`;
    clearInterval(timerInterval);
    document.getElementById('timer').textContent = '--';
});

socket.on('match-end', ({ winner, loser, score }) => {
    const message = winner === user
        ? `🎉 You won the match ${score}! Congratulations!`
        : `💔 You lost the match ${score}. ${winner} was victorious.`;

    // Show alert and redirect after 3 seconds
    alert(message);
    setTimeout(() => {
        location.href = '/game/menu';
    }, 3000);
});


socket.on('sync-state', ({ banSources, history }) => {
    window.banSources = banSources;
    window.matchHistory = history;
});

socket.on('mark-result', ({ winnerId, roundIndex }) => {
    const loserId = players.find(p => p !== winnerId);
    const winnerSlot = winnerId === user ? 'pick-you' : 'pick-opp';
    const loserSlot = loserId === user ? 'pick-you' : 'pick-opp';

    const winSlot = document.querySelectorAll(`#${winnerSlot} .img-thumbnail`);
    const loseSlot = document.querySelectorAll(`#${loserSlot} .img-thumbnail`);

    if (winSlot[roundIndex]) winSlot[roundIndex].classList.add('win-mark');
    if (loseSlot[roundIndex]) loseSlot[roundIndex].classList.add('lose-mark');
});


function markPickResult(winnerId, roundIndex) {
    const loserId = players.find(p => p !== winnerId);

    const addMark = (userId, symbol, colorClass) => {
        const container = userId === user ? document.getElementById('pick-you') : document.getElementById('pick-opp');
        const slots = container.querySelectorAll('.pick-slot');
        const slot = slots[roundIndex];
        if (!slot || slot.childElementCount === 0) return;

        const badge = document.createElement('div');
        badge.textContent = symbol;
        badge.classList.add(
            'position-absolute',
            'top-0',
            'start-0',
            'bg-dark',
            'rounded-circle',
            'px-1',
            'text-white',
            'fw-bold',
            colorClass
        );
        badge.style.fontSize = '0.75rem';
        slot.firstChild.appendChild(badge);
    };

    addMark(winnerId, 'W', 'text-success');
    addMark(loserId, 'L', 'text-danger');
}
