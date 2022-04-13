const router = require('express').Router();
const { wrapAsync, authentication } = require('../../util/util');
const { createArticle, getFullArticle, getNewsFeed } = require('../controllers/article_controller');
const { USER_ROLE } = require('../models/user_model');

router.route('/articles').post(authentication(USER_ROLE.ALL), wrapAsync(createArticle));
router.route('/articles/NewsFeed').get(authentication(USER_ROLE.ALL), wrapAsync(getNewsFeed));
router.route('/articles/:articleId').get(wrapAsync(getFullArticle));

module.exports = router;
