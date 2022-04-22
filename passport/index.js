const passport = require('passport');
const local = require('./local');

module.exports = () => {
    passport.serializeUser(() => {

    });

    passport.deserializeUser(() => {

    });

    local();
}

// app.js에서 실행됨