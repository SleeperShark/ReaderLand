const router = require('express').Router();
const { wrapAsync, authentication } = require('../../util/util');
const {
    getUserInfo,
    signUp,
    signIn,
    getUserProfile,
    subscribe,
    follow,
    unfollow,
    unsubscribe,
    favorite,
    unfavorite,
    getSubscription,
    updateUserProfile,
    getAuthorProfile,
} = require('../controllers/user_controller');

const { USER_ROLE } = require('../models/user_model');

router.route('/user/info').get(authentication(USER_ROLE.ALL), wrapAsync(getUserInfo));

router.route('/user/signup').post(wrapAsync(signUp));
router.route('/user/signin').post(wrapAsync(signIn));
router.route('/user/profile').get(authentication(USER_ROLE.ALL), wrapAsync(getUserProfile));
router.route('/user/profile').put(authentication(USER_ROLE.ALL), wrapAsync(updateUserProfile));

router.route('/user/subscribe').get(authentication(USER_ROLE.ALL), wrapAsync(getSubscription));
router.route('/user/subscribe').post(authentication(USER_ROLE.ALL), wrapAsync(subscribe));
router.route('/user/subscribe').delete(authentication(USER_ROLE.ALL), wrapAsync(unsubscribe));

router.route('/user/follow').post(authentication(USER_ROLE.ALL), wrapAsync(follow));
router.route('/user/follow').delete(authentication(USER_ROLE.ALL), wrapAsync(unfollow));

router.route('/user/favorite').post(authentication(USER_ROLE.ALL), wrapAsync(favorite));
router.route('/user/favorite').delete(authentication(USER_ROLE.ALL), wrapAsync(unfavorite));

router.route('/user/:id').get(wrapAsync(getAuthorProfile));

module.exports = router;
