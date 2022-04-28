const express = require('express');

const {Post, Image, User, Comment} = require('../models');

const router = express.Router();

router.get('/', async (req, res, next) => { // GET/posts
    try {
        const posts = await Post.findAll({
            limit : 10,
            order : [
                ['createdAt', 'DESC'],
                [Comment, 'createdAt', 'DESC'], // 댓글 내림차순 정렬
            ],
            include : [{
                model : User,
                attributes : ['id', 'nickname'],
            }, {
                model : Image,
            }, {
                model : Comment,
                include : [{
                    model : User,
                    attributes : ['id', 'nickname'],
                }]
            },{
                model : User, 
                as : 'Likers',
                attributes : ['id'],
            }, {
                model : Post,
                as : 'Retweet',
                include : [{
                    model : User,
                    attributes : ['id', 'nickname'],
                }, {
                    model : Image,
                }]
            }],
        });
        res.status(200).json(posts);
    }
    catch(error) {
        console.error(error);
        next(error);
    }
});

module.exports = router;


// 게시글을 가져올 때는 offset & limit과 lastId & limit 방식이 있는데 
// offset 방식을 사용하면 로딩하는 와중에 게시글을 삭제 또는 생성할 경우 limit과 offset이
// 꼬이는 문제가 발생한다. 반면 lastId 방식은 lastId가 이미 정해진 상태이므로
// 로딩중에 게시글이 생성되거나 삭제 되거나 심지어 lastId에 해당하는 게시글이 삭제되어도
// 이미 정의된 lastId보다 작은 수의 게시글부터 불러오므로 lastId & limit 방식을 많이 사용한다.