const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');

const postRouter = require('./routes/post');
const postsRouter = require('./routes/posts');
const userRouter = require('./routes/user');
const hashtagRouter = require('./routes/hashtag');
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

app.use(morgan('dev'));
app.use(cors({
    origin : 'http://localhost:3060', // *은 모든 브라우저의 요청을 허용해 해커의 위험성이 있지만 true로 하면 보낸곳의 주소가 자동으로 들어간다.
    // 단 아래줄의 credentials를 true로 설정해줄 경우 민감한 정보가 담겨있는 쿠키가 왔다갔다하므로 origin을 *로 해주는 것이 불가능함.(true는 가능)
    // 더 보안을 철저히 하기 위해 정확한 도메인 주소를 적어주어야한다.
    credentials : true, // credentail true를 설정해줌으로써 백서버에서 프론트 서버로 쿠키도 같이 전달이 가능해짐.
}));

// 서버 주소가 프론트는 3060 백은 3065로 달라 이미지가 전달이 안되므로 static이라는
// 미들웨어를 사용하여 디렉토리네임이 uploads인것을 찾아 경로를 localhost:3065/uploads로 바꿔준다.
// 프론트에서는 슬래쉬로 해당 파일을 접근하고 백엔드쪽의 폴더 구조를 알 방법이 없기 때문에
// 보안상 유리한 점이 있다.
app.use('/', express.static(path.join(__dirname, 'uploads')));
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


app.use('/posts', postsRouter);
app.use('/post', postRouter);
app.use('/user', userRouter);
app.use('/hashtag', hashtagRouter);

app.listen(3065, () => {
    console.log('서버 실행 중');
});

// 서버에서 브라우저로 데이터(예를들면 로그인 정보)를 전송할때 그냥 보내면 해킹에 취약하므로
// 의미없는 토큰으로 이루어진 쿠키를 보내고 서버에서는 같은 의미없는 토큰으로 이루어진 세션으로 실제 데이터를 구분한다.


// 전체적인 로그인 흐름
// 위에서 app.use가 실행되면 userRouter가 샐행됨 
// 그다음 isNotLoggedIn 미들웨어로 back서버에서 로그인 유무를 파악한 다음에
// next에 인자가 없으므로 그 다음 미들웨어인 res, req, next 를 실행하여 로그인 처리함.