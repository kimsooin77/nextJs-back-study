const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { Op } = require('sequelize');

const {User, Post,  Image, Comment} = require('../models');
const { isLoggedIn, isNotLoggedIn} = require('./middlewares');
const router = express.Router();

// 새로고침시에도 로그인 정보가 저장되도록 사용자 아이디 불러오기
router.get('/', async (req, res, next) => { // GET /user
    console.log(req.user);
    try {
        if(req.user) { // 로그인 되어있는 상태일 때(req.user가 존재하므로 true)만 유저 아이디 가져오기 
            const fullUserWithoutPassword = await User.findOne({ 
                where : { id : req.user.id},
                attributes : {
                    exclude : ['password'] // 보안에 취약한 비밀번호를 제외하고 정보를 받아오기 위한 설정
                },
                include : [{
                    model : Post,
                    attributes : ['id'],
                }, {
                    model : User,
                    as : 'Followings',
                    attributes : ['id'],
                }, {
                    model : User,
                    as : 'Followers',
                    attributes : ['id'],
                }]
            })
            res.status(200).json(fullUserWithoutPassword);
        }else { // 로그아웃 상태에서는 req.user이 없으므로 아무것도 전송하지 않음.
            res.status(200).json(null);
        }
    }catch (error){
        console.error(error);
        next(error);
    }

})

router.get('/followers',isLoggedIn, async (req, res, next) => { // GET/user/followers
    try {
        const user = await User.findOne({ where : {id : req.user.id}});
        if(!user) {
            return res.status(403).send('팔로우하는 대상을 선택해 주세요.');
        }
        const followers = await user.getFollowers({
            limit : parseInt(req.query.limit, 10),
        });
        res.status(200).json(followers);
    }catch(error) {
        console.error(error);
        next(error);
    }
});

router.get('/followings',isLoggedIn, async (req, res, next) => { // GET/user/followings
    try {
        const user = await User.findOne({ where : {id : req.user.id}});
        if(!user) {
            return res.status(403).send('팔로우하는 대상을 선택해 주세요.');
        }
        const followings = await user.getFollowings({
            limit : parseInt(req.query.limit, 10),
        });
        res.status(200).json(followings);
    }catch(error) {
        console.error(error);
        next(error);
    }
});

router.get('/:userId', async (req, res, next) => { // GET /user/1
    try {
      const fullUserWithoutPassword = await User.findOne({
        where: { id: req.params.userId },
        attributes: {
          exclude: ['password']
        },
        include: [{
          model: Post,
          attributes: ['id'],
        }, {
          model: User,
          as: 'Followings',
          attributes: ['id'],
        }, {
          model: User,
          as: 'Followers',
          attributes: ['id'],
        }]
      })
      if (fullUserWithoutPassword) {
        const data = fullUserWithoutPassword.toJSON();
        data.Posts = data.Posts.length; // 개인정보 침해 예방
        data.Followers = data.Followers.length;
        data.Followings = data.Followings.length;
        res.status(200).json(data);
      } else {
        res.status(404).json('존재하지 않는 사용자입니다.');
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  });

router.get('/:userId/posts', async (req, res, next) => { // GET /user/1/posts
    try {
      const where = { UserId: req.params.userId };
      if (parseInt(req.query.lastId, 10)) { // 초기 로딩이 아닐 때
        where.id = { [Op.lt]: parseInt(req.query.lastId, 10)}
      } // 21 20 19 18 17 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1
      const posts = await Post.findAll({
        where,
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [{
          model: User,
          attributes: ['id', 'nickname'],
        }, {
          model: Image,
        }, {
          model: Comment,
          include: [{
            model: User,
            attributes: ['id', 'nickname'],
            order: [['createdAt', 'DESC']],
          }],
        }, {
          model: User, // 좋아요 누른 사람
          as: 'Likers',
          attributes: ['id'],
        }, {
          model: Post,
          as: 'Retweet',
          include: [{
            model: User,
            attributes: ['id', 'nickname'],
          }, {
            model: Image,
          }]
        }],
      });
      res.status(200).json(posts);
    } catch (error) {
      console.error(error);
      next(error);
    }
  });

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
        return req.login(user, async (loginErr) => {
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
                    attributes : ['id'],
                }, {
                    model : User,
                    as : 'Followings',
                    attributes : ['id'],
                }, {
                    model : User,
                    as : 'Followers',
                    attributes : ['id'],
                }]
            })
            // 에러가 없을 경우
            return res.status(200).json(fullUserWithoutPassword);
        })
    })(req, res, next);
}); 

router.post('/',isNotLoggedIn, async (req, res, next) => { //POST /user/
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
        res.status(201).send('ok');
    }catch (error) {
        console.error(error);
        next(error); // status 500
    }
});

router.post('/logout', isLoggedIn, (req,res) => {
    req.logout();
    req.session.destroy();
    res.send('ok');
});

// 닉네임 수정
router.patch('/nickname', isLoggedIn, async (req, res, next) => {
    try {
        await User.update({
            nickname : req.body.nickname, // 프론트에서 제공한 닉네임으로 수정
        }, {
            where : {id : req.user.id}, // 조건 : 닉네임 중 내 아이디에 해당하는것
        });
        res.status(200).json({nickname : req.body.nickname});
    }catch(error) {
        console.error(error);
        next(error);
    }
})

router.patch('/:userId/follow',isLoggedIn, async (req, res, next) => { // PATCH/user/1/follow
    try {
        const user = await User.findOne({ where : {id : req.params.userId}});
        if(!user) {
            return res.status(403).send('팔로우하는 대상을 선택해 주세요.');
        }
        await user.addFollowers(req.user.id); // 팔로우 하는 대상의 팔로워에 내 아이디를 넣어줌
        res.status(200).json({UserId : parseInt(req.params.userId, 10)}); // 상대방 아이디
    }catch(error) {
        console.error(error);
        next(error);
    }
});

router.delete('/:userId/follow',isLoggedIn, async (req, res, next) => { // DELETE/user/1/follow
    try {
        const user = await User.findOne({ where : {id : req.params.userId}});
        if(!user) {
            return res.status(403).send('언팔로우하는 대상을 선택해 주세요.');
        }
        await user.removeFollowers(req.user.id); // 상대방의 팔로워에서 내 아이디를 제거
        res.status(200).json({UserId : parseInt(req.params.userId, 10)});
    }catch(error) {
        console.error(error);
        next(error);
    }
});



router.delete('/follower/:userId',isLoggedIn, async (req, res, next) => { // DELETE/user/follower/2
    try {
        const user = await User.findOne({ where : {id : req.params.userId}});
        if(!user) {
            return res.status(403).send('차단하는 대상을 선택해 주세요.');
        }
        await user.removeFollowings(req.user.id); // 상대방의 팔로잉에서 내 아이디를 제거
        res.status(200).json({UserId : parseInt(req.params.userId, 10)});
    }catch(error) {
        console.error(error);
        next(error);
    }
});





module.exports = router;

// 비밀번호를 그대로 전송할 시 해킹의 위험이 있으므로 bcrypt라는 라이브러리를 사용하여 암호화해 전달해준다.
// 두번째로 전송해 주는 숫자는 보통 10-13 사이의 수인데 수가 높을 수록 암호화의 수준이 높아진다.
// 이메일 중복체크 하기 위해 findeOne 사용 조건은 where안에 명시
// 요청/응답은 헤더(상태, 용량, 시간, 쿠키)와 바디(데이터)로 구성되어있다.

// req, res, next -> 미들웨어