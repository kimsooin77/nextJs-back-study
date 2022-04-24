const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');

const {User, Post} = require('../models');
const { isLoggedIn, isNotLoggedIn} = require('./middlewares');
const router = express.Router();


// 로그인은 로그인을 안한 사람들만 할 수 있으므로 isNotLoggedIn을 전달
router.post('/login',isNotLoggedIn, (req, res, next) => {
    // 여기서 user는 비밀번호는 있고 팔로잉, 팔로워에 대한 정보는 없는 유저이기 때문에 아래에서 다시 유저를 받아온다.
    passport.authenticate('local', (err, user, info) => {
        // 서버쪽에 에러가 있는 경우
        if(err) {
            console.error(err);
            return next(err);
        }
        // 클라이언트에서 에러가 발생한 경우
        if(info) {
            return res.status(401).send(info.reason);
        }
        return req.login(user, async(loginErr) => {
            // 패스포트에서 에러가 발생한 경우
            if(loginErr) {
                console.error(loginErr);
                return next(loginErr);
            }
            // 비밀번호를 제외한 모든 유저 정보를 담은 변수
            const fullUserWithoutPassword = await User.findOne({ 
                where : { id : user.id},
                attributes : {
                    exclude : ['password'] // 보안에 취약한 비밀번호를 제외하고 정보를 받아오기 위한 설정
                },
                include : [{
                    model : Post,
                }, {
                    model : User,
                    as : 'Followings',
                }, {
                    model : User,
                    as : 'Followers',
                }]
            })
            // 에러가 없을 경우
            return res.status(200).json(fullUserWithoutPassword);
        })
    })(req, res, next);
}); 

router.post('/',isNotLoggedInasync, (req, res, next) => { //POST /user/
    try{
        // 프론트에서 보낸 이메일과 같은 이메일을 사용하는 사용자가 있는지를 exUser 변수에 저장
        // 없다면 null 
        const exUser = await User.findOne({
            where : {
                email : req.body.email,
            }
        });
        // 있다면
        if(exUser) {
            return res.status(403).send('이미 사용중인 아이디입니다.');
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 12);
        await User.create({
            email: req.body.email,
            nickname : req.body.nickname,
            password : hashedPassword,
        });
        res.status(200).send('ok');
    }catch (error) {
        console.error(error);
        next(error); // status 500
    }
});

router.post('/logout', isLoggedIn, (req,res, next) => {
    req.logout();
    req.session.destroy();
    res.send('ok');
})

module.exports = router;

// 비밀번호를 그대로 전송할 시 해킹의 위험이 있으므로 bcrypt라는 라이브러리를 사용하여 암호화해 전달해준다.
// 두번째로 전송해 주는 숫자는 보통 10-13 사이의 수인데 수가 높을 수록 암호화의 수준이 높아진다.
// 이메일 중복체크 하기 위해 findeOne 사용 조건은 where안에 명시
// 요청/응답은 헤더(상태, 용량, 시간, 쿠키)와 바디(데이터)로 구성되어있다.

// req, res, next -> 미들웨어