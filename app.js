const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const dotenv = require('dotenv');

const postRouter = require('./routes/post');
const userRouter = require('./routes/user');
const db = require('./models');
const passportConfig = require('./passport');


dotenv.config();
const app = express();

db.sequelize.sync()
    .then(() => {
        console.log('db 연결 성공');
    })
    .catch(console.error);
passportConfig();

app.use(cors({
    origin : true, // *은 모든 브라우저의 요청을 허용해 해커의 위험성이 있지만 true로 하면 보낸곳의 주소가 자동으로 들어간다.
    // credentials : false,
}));
// 프론트 서버에서 보내준 액션데이터를 req.body안에 넣어주는 역할
app.use(express.json()); // json 데이터 처리
app.use(express.urlencoded( {extended : true})); // form submit시 urlencoded방식으로 처리
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
    saveUninitialized : false,
    resave : false,
    secret : process.env.COOKIE_SECRET,
}));
app.use(passport.initialize());
app.use(passport.session());

// app.get : 가져오다
// app.post : 생성하다
// app.put  : 전체 수정
// app.delete : 제거
// app.patch : 부분 수정
// app.options : 찔러보기
// app.head : 헤더만 가져오기


// '/'은 url get은 메서드
app.get('/' , (req,res) => {
    res.send('hellow express');
});

app.get('/' , (req,res) => {
    res.send('hellow api');
});

app.get('/posts', (req,res) => {
    res.json([
        {id : 1, content: 'hello'},
        {id : 2, content: 'hello2'},
        {id : 3, content: 'hello3'},
    ])
});

app.use('/post', postRouter);
app.use('/user', userRouter);

app.listen(3065, () => {
    console.log('서버 실행 중');
});

// 서버에서 브라우저로 데이터(예를들면 로그인 정보)를 전송할때 그냥 보내면 해킹에 취약하므로
// 의미없는 토큰으로 이루어진 쿠키를 보내고 서버에서는 같은 의미없는 토큰으로 이루어진 세션으로 실제 데이터를 구분한다.