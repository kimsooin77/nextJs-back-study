const passport = require('passport');
const local = require('./local');
const {User} = require('../models');

module.exports = () => {
    passport.serializeUser((user, done) => {
        done(null, user.id); // user 정보중에서 id만 쿠키에 저장
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findOne({  where : {id} });
            done(null, user); // req.user
        }
        catch (error){
            console.error(error);
            done(error);
        }
    });

    local();
};

// app.js에서 실행됨