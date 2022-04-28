const router = require('express').Router();
const { wrapAsync, authentication } = require('../../util/util');
const {
    createArticle,
    getArticle,
    getNewsFeed,
    likeArticle,
    unlikeArticle,
    getCategories,
    getLatestArticles,
    commentArticle,
    replyComment,
    readArticle,
} = require('../controllers/article_controller');

const { USER_ROLE } = require('../models/user_model');

router.route('/articles').post(authentication(USER_ROLE.ALL), wrapAsync(createArticle));
router.route('/articles/newsfeed').get(authentication(USER_ROLE.ALL), wrapAsync(getNewsFeed));

router.route('/articles/latest').get(authentication(USER_ROLE.ALL, false), wrapAsync(getLatestArticles));
router.route('/articles/categories').get(wrapAsync(getCategories));

router.route('/articles/:articleId/read').put(wrapAsync(readArticle));

router.route('/articles/:articleId/like').post(authentication(USER_ROLE.ALL), wrapAsync(likeArticle));
router.route('/articles/:articleId/like').delete(authentication(USER_ROLE.ALL), wrapAsync(unlikeArticle));

// TODO: reader leave comment
router.route('/articles/:articleId/comment').post(authentication(USER_ROLE.ALL), wrapAsync(commentArticle));
router.route('/articles/:articleId/replyComment').post(authentication(USER_ROLE.ALL), wrapAsync(replyComment));

router.route('/articles/:articleId').get(authentication(USER_ROLE.ALL, false), wrapAsync(getArticle));

module.exports = router;
