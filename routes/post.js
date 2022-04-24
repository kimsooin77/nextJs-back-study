const express = require('express');

const { Post } = require('../models');
const {isLoggedIn} = require('./middlewares');

const router = express.Router();

router.post('/',isLoggedIn,  async (req,res) => { // POST/post
    try {
        const post = await Post.create({
            content : req.body.content,
            UserId : req.user.id,
        });
        res.status(201).json(post); // 프론트에서 받아온 데이터를 다시 json 형태로 돌려줌
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
            PostId : req.params.postId,
            UserId : req.user.id,
        })
        res.status(201).json(comment);
    }catch (error) {
        console.error(error);
        next(error);
    }
    
});

router.delete('/', (req,res) => {
    res.json({id : 1});
});
module.exports = router;