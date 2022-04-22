const express = require('express');
const postRouter = require('./routes/post');
const userRouter = require('./routes/user');

const db = require('./models');

const app = express();

db.sequelize.sync()
    .then(() => {
        console.log('db 연결 성공');
    })
    .catch(console.error);

// 프론트 서버에서 보내준 액션데이터를 req.body안에 넣어주는 역할
app.use(express.json()); // json 데이터 처리
app.use(express.urlencoded( {extended : true})); // form submit시 urlencoded방식으로 처리


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