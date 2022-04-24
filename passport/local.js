const passport = require('passport');
const { Strategy : LocalStrategy} = require('passport-local');
const bcrypt = require('bcrypt');
const {User} = require('../models');

module.exports = () => {
    passport.use(new LocalStrategy({
        usernameField : 'email', // req.body.email을 지칭
        passwordField : 'password', //  req.body.password를 지칭

    }, async (email, password, done) => {
        try {
            const user = await User.findOne({
                // 로그인시 이메일이 있는지 여부를 찾고
                where : {email}
            });
            // 없다면
            if (!user) {
                // 첫번째는 서버에러 두 번째는 성공했는지, 세번째는 클라이언트 에러
                return done(null, false, {reason : '존재하지 않는 이메일입니다.'})
            }
            // db에 저장된 비밀번호와 사용자가 입력한 비밀번호를 비교
            const result = await bcrypt.compare(password, user.password);
            if(result) { // 로그인 성공
                return done(null, user);
            }
            return done(null, false, {reason : '비밀번호가 틀렸습니다.'});
        }
        catch (error) {
            console.error(error);
            return done(error);
        }
    }));
};


// passport index.js에서 실행됨