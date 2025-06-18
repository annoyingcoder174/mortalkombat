const mongoose = require('mongoose');
const Champion = require('../models/Champion'); // go up to models
const fighters = require('./fighters_with_stats.json'); // local file in utils

mongoose.connect('mongodb://localhost:27017/mkxl_banpick')
    .then(async () => {
        await Champion.deleteMany(); // Clear old data
        await Champion.insertMany(fighters); // Insert new data
        console.log("✅ Champions seeded.");
        process.exit();
    })
    .catch(err => {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    });
