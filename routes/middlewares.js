exports.isLoggedIn = (req, res, next) => {
    // front에서 me의 유무로 로그인 성공유무를 알아냈다면 back에서는 패스포트에서 제공하는
    // authenticated로 로그인 성공유무를 알아낼 수 있다.
    // 로그인이 성공이라면 req.isAuthenticated의 값은 true이다.
    if(req.isAuthenticated()) { 
        // next에 인자가 아무것도 전달되지 않으면 다음 미들웨어 실행(인자가 있다면 에러처리)
        next();
    }else {
        res.status(401).send('로그인이 필요합니다.');
    }
};

exports.isNotLoggedIn = (req, res, next) => {
    if(!req.isAuthenticated()) { 
        next();
    }else {
        res.status(401).send('로그인이 필요합니다.');
    }
};