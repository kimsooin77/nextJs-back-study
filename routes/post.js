const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { Post, Image, Comment, User, Hashtag } = require('../models');
const {isLoggedIn} = require('./middlewares');

const router = express.Router();

try{
    fs.accessSync('uploads');
}catch(error) {
    console.error('uploads 폴더가 없으므로 생성합니다.');
    fs.mkdirSync('uploads');
}

// 이미지나 비디오, 텍스트 등의 소스를 위한 미들웨어 multer
const upload = multer({
    storage : multer.diskStorage({
        destination(req, file, done) {
            done(null, 'uploads');
        },
        filename(req, file, done) { // 김수인.png
            const ext = path.extname(file.originalname); // 확장자 추출(.png)
            const basename = path.basename(file.originalname, ext); // 김수인20220426123315.png
            done(null, basename + '_' + new Date().getTime() + ext); // 날짜를 넣어주는 이유는 파일명이 겹치는 경우 덮어씌우는걸 방지하기 위함
        },
    }),
    limits : {fileSize : 20 * 1024 * 1024}, // 20MB
});

router.post('/',isLoggedIn, upload.none(),  async (req,res, next) => { // POST/post
    try {
        const hashtags = req.body.content.match(/#[^\s#]+/g);
        const post = await Post.create({
            content : req.body.content,
            UserId : req.user.id,
        });
        if(hashtags) { // findOrCreate는 디비에 해쉬태그가 중복해서 등록되는걸 막기 위해 가져오거나 없으면 등록하는 메소드이다.
            const result = await Promise.all(hashtags.map((tag) =>  Hashtag.findOrCreate({
                where : { name : tag.slice(1).toLowerCase() }
            }))); // result의 모양은 [노드, true], [리액트, true] 이런식으로 배열로 담기는데 첫번째는 해쉬태그이름 두번째는 생성됐는지가 불리언 값으로 
            // 들어가기 때문에 0번째 인덱스만 추출해서 더해준다.
            await post.addHashtags(result.map((v) => v[0]) );
        }
        if(req.body.image) {
            if(Array.isArray(req.body.image)) { // 이미지를 여러 개 올리면 image : [sooin.png, kimsoo.png]이런 배열 형식으로 디비가 생성되고
                const images = await Promise.all(req.body.image.map((image) => Image.create({src : image})));
                await post.addImages(images);
            }else { // 이미지를 하나만 올리면 image : 김수.png로 배열이 아닌 형태로 디비에 생성된다.
                const image = await Image.create({src : req.body.image});
                await post.addImages(image);
            }
        }

        const fullPost = await Post.findOne({
            where : { id : post.id},
            include : [{
                model : Image,
            }, {
                model : Comment,
                include  : [{
                    model : User, // 댓글 작성자
                    attributes : ['id', 'nickname']
                }],
            }, {
                model : User, // 게시글 작성자
                attributes : ['id', 'nickname']
            }, {
                model : User, // 좋아요 누른 작성자
                as : 'Likers',
                attributes : ['id'],
            }]
        })
        res.status(201).json(fullPost); // 프론트에서 받아온 데이터를 다시 json 형태로 돌려줌
    }catch (error) {
        console.error(error);
        next(error);
    }
});



// array인 이유는 여러장을 올리기 위해(image는 postForm에 Input의 name="image"에서 가져온 것)
// 이미지는 위의 upload에서 올려주고 아래 router는 이미지 업로드 후에 실행된다.
router.post('/images', isLoggedIn, upload.array('image'), (req,res,next) => { // POST/post/images
    console.log(req.files);
    res.json(req.files.map((v) => v.filename));
});

router.get('/:postId', async (req,res, next) => { // GET/post/1
    try {
        // 존재하지 않는 포스트에 댓글이 생성되거나 삭제되는것을 방지하기 위해 포스트의 존재여부를 먼저 검사
        const post = await Post.findOne({
            where : {id : req.params.postId}, 
        });
        if(!post) {
            return res.status(404).send('존재하지 않는 게시글입니다.');
        }
        const fullPost = await Post.findOne({
            where : {id : post.id},
            include : [{
                model : Post,
                as : 'Retweet',
                include : [{
                    model : User,
                    attributes : ['id', 'nickname'],
                }, {
                    model : Image,
                }] 
            }, {
                model: User,
                attributes: ['id', 'nickname'],
              }, {
                model: User,
                as: 'Likers',
                attributes: ['id', 'nickname'],
              }, {
                model: Image,
              }, {
                model: Comment,
                include: [{
                  model: User,
                  attributes: ['id', 'nickname'],
                }],
              }],
            })
            res.status(200).json(fullPost);
    }catch (error) {
        console.error(error);
        next(error);
    }
});

router.post('/:postId/retweet',isLoggedIn, async (req,res, next) => { // POST/post/1/retweet
    try {
        // 존재하지 않는 포스트에 댓글이 생성되거나 삭제되는것을 방지하기 위해 포스트의 존재여부를 먼저 검사
        const post = await Post.findOne({
            where : {id : req.params.postId}, 
            include : [{
                model : Post,
                as : 'Retweet',
            }],
        });
        if(!post) {
            return res.status(403).send('존재하지 않는 게시글입니다.');
        }
        // 1. 내 아이디와 리트윗하고자 하는 포스터의 사용자 아이디가 같을 경우(내가 내 포스팅을 리트윗하려는경우)
        // 2. 리트윗된 포스터가 있는데 그 리트윗된 포스터의 사용자 아이디와 내 아아디가 같을 때 (다른사람이 리트윗한 내 포스터를 내가 다시 리트윗하고자 할때)
        if (req.user.id === post.UserId || (post.Retweet && post.Retweet.UserId === req.user.id)) {
            return res.status(403).send('자신의 글은 리트윗할 수 없습니다.');
        }
        // 사람1이 작성한 게시글을 사람2가 리트윗한 후 내가 다시 사람2의 리트윗된 게시글을 리트윗하고자 할때
        // 이미 리트윗된 게시글이라면 post.RetweetId를 사용하고 내가 처음으로 리트윗하는 포스터이면 post의 아이디를 사용
        const retweetTargetId = post.RetweetId || post.id;
        const exPost = await Post.findOne({
            where : {
                UserId  :  req.user.id,
                RetweetId : retweetTargetId,
            },
        });
        if(exPost) {
            return res.status(403).send('이미 리트윗된 게시글입니다.');
        }
        const retweet = await Post.create({
            UserId : req.user.id,
            RetweetId : retweetTargetId,
            content : 'retweet',
        });
        const retweetWithPrevPost = await Post.findOne({
            where : {id : retweet.id},
            include : [{
                model : Post,
                as : 'Retweet',
                include : [{
                    model : User,
                    attributes : ['id', 'nickname'],
                }, {
                    model : Image,
                }] 
            }, {
                model : User,
                attributes : ['id', 'nickname'],
            },  {
                model: User, // 좋아요 누른 사람
                as: 'Likers',
                attributes: ['id'],
              }, {
                model: Image,
              }, {
                model: Comment,
                include: [{
                  model: User,
                  attributes: ['id', 'nickname'],
                }],
              }],
            })
            res.status(201).json(retweetWithPrevPost);
    }catch (error) {
        console.error(error);
        next(error);
    }
});

router.post('/:postId/comment',isLoggedIn, async (req,res,next) => { // POST/post/comment
    try {
        // 존재하지 않는 포스트에 댓글이 생성되거나 삭제되는것을 방지하기 위해 포스트의 존재여부를 먼저 검사
        const post = await Post.findOne({
            where : {id : req.params.postId} // 위에서 :이 params 다음 postId이므로 postId
        })
        if(!post) {
            return res.status(403).send('존재하지 않는 게시글입니다.');
        }
        const comment = await Comment.create({
            content : req.body.content,
            PostId : parseInt(req.params.postId, 10),
            UserId : req.user.id,
        })
        const fullComment = await Comment.findOne({
            where : {id : comment.id},
            include : [{
                model : User,
                attributes : ['id', 'nickname']
            }]
        })
        res.status(201).json(fullComment);
    }catch (error) {
        next(error);
    }
});


router.patch('/:postId/like',isLoggedIn, async (req, res, next) => { // PATCH/post/1/like
    try {
        const post = await Post.findOne({ where : {id : req.params.postId}});
        if(!post) {
            return res.status(403).send('게시글이 존재하지 않습니다.');
        }
        await post.addLikers(req.user.id);
        res.json({PostId : post.id, UserId : req.user.id});
    }catch(error) {
        console.error(error);
        next(error);
    }
    
});

router.delete('/:postId/like',isLoggedIn, async (req, res, next) => { // DELETE/post/1/like
    try {
        const post = await Post.findOne({ where : {id : req.params.postId}});
        if(!post) {
            return res.status(403).send('게시글이 존재하지 않습니다.');
        }
        await post.removeLikers(req.user.id);
        res.json({PostId : post.id, UserId : req.user.id});
    }catch(error) {
        console.error(error);
        next(error);
    }
});

// 게시글 삭제
router.delete('/:postId',isLoggedIn, async (req,res,next) => { // DELETE /post/10
    try {
        await Post.destroy({
            where : {
                id : req.params.postId,
                UserId : req.user.id, // 내가 작성한s 포스트만 지우게 하기 위해 사용자 아이디도 조건으로 넣어줌.
            },
        })
        res.status(200).json({PostId : parseInt(req.params.postId, 10)}); // params는 문자열이기 때문에 반드시 parseInt로 숫자로 바꿔줘야함
    }catch(error) {
        console.error(error);
        next(error);
    }
});


module.exports = router;