const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { Post, Image, Comment, User } = require('../models');
const {isLoggedIn} = require('./middlewares');

const router = express.Router();

try{
    fs.accessSync('uploads');
}catch(error) {
    console.error('uploads 폴더가 없으므로 생성합니다.');
    fs.mkdirSync('uploads');
}

router.post('/',isLoggedIn,  async (req,res, next) => { // POST/post
    try {
        const post = await Post.create({
            content : req.body.content,
            UserId : req.user.id,
        });
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
})

// array인 이유는 여러장을 올리기 위해(image는 postForm에 Input의 name="image"에서 가져온 것)
// 이미지는 위의 upload에서 올려주고 아래 router는 이미지 업로드 후에 실행된다.
router.post('/images', isLoggedIn, upload.array('image'), (req,res,next) => { // POST/post/images
    console.log(req.files);
    res.json(req.files.map((v) => v.filename));
})

router.post('/:postId/comment',isLoggedIn, async (req,res) => { // POST/post/comment
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
        console.error(error);
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
router.delete('/:postId', async (req,res,next) => { // DELETE /post/10
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