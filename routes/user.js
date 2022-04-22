const express = require('express');
const bcrypt = require('bcrypt');
const {User} = require('../models');
const router = express.Router();

router.post('/', async(req, res, next) => {
    try{
        // 프론트에서 보낸 이메일과 같은 이메일을 사용하는 사용자가 있는지를 exUser 변수에 저장
        // 없다면 null 
        const exUser = await User.findOne({
            where : {
                email : req.body.email,
            }
        });
        // 았다면
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

module.exports = router;

// 비밀번호를 그대로 전송할 시 해킹의 위험이 있으므로 bcrypt라는 라이브러리를 사용하여 암호화해 전달해준다.
// 두번째로 전송해 주는 숫자는 보통 10-13 사이의 수인데 수가 높을 수록 암호화의 수준이 높아진다.
// 이메일 중복체크 하기 위해 findeOne 사용 조건은 where안에 명시
// 요청/응답은 헤더(상태, 용량, 시간, 쿠키)와 바디(데이터)로 구성되어있다.