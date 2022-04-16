const router = require('express').Router();
const { wrapAsync, authentication } = require('../../util/util');
const { createArticle, getFullArticle, getNewsFeed, likeArticle, unlikeArticle } = require('../controllers/article_controller');
const { USER_ROLE } = require('../models/user_model');

router.route('/articles').post(authentication(USER_ROLE.ALL), wrapAsync(createArticle));
router.route('/articles/newsfeed').get(authentication(USER_ROLE.ALL), wrapAsync(getNewsFeed));

router.route('/articles/:articleId/like').post(authentication(USER_ROLE.ALL), wrapAsync(likeArticle));
router.route('/articles/:articleId/like').delete(authentication(USER_ROLE.ALL), wrapAsync(unlikeArticle));

router.route('/articles/:articleId').get(wrapAsync(getFullArticle));

module.exports = router;
