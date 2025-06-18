const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');

// Redirect root to login or menu depending on session
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/game/menu');
    } else {
        return res.redirect('/login');
    }
});

module.exports = router;


router.get('/login', (req, res) => {
    res.render('auth/login', { user: null });
});

router.get('/register', (req, res) => {
    res.render('auth/register', { user: null });
});

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.send('Username already exists');

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed });

    req.session.user = { id: user._id, username: user.username };
    res.redirect('/game/menu');
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.send('Invalid username or password');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.send('Invalid username or password');

    req.session.user = { id: user._id, username: user.username };
    res.redirect('/game/menu');
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
