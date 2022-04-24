const express = require('express');

const { Post, Image, Comment, User } = require('../models');
const {isLoggedIn} = require('./middlewares');

const router = express.Router();

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
                include  : User, // 댓글 작성자
                attributes : ['id', 'nickname']
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

router.delete('/', (req,res) => {
    res.json({id : 1});
});
module.exports = router;