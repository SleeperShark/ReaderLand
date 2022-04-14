const router = require('express').Router();
const { wrapAsync, authentication } = require('../../util/util');
const { signUp, signIn, getUserProfile, subscribe, follow } = require('../controllers/user_controller');
const { USER_ROLE } = require('../models/user_model');

router.route('/user/signup').post(wrapAsync(signUp));
router.route('/user/signin').post(wrapAsync(signIn));
router.route('/user/profile').get(authentication(USER_ROLE.ALL), wrapAsync(getUserProfile));
router.route('/user/subscribe').post(authentication(USER_ROLE.ALL), wrapAsync(subscribe));
router.route('/user/follow').post(authentication(USER_ROLE.ALL), wrapAsync(follow));
// router.route('/user/subscribe').post(authentication(USER_ROLE.ALL), wrapAsync(subscribeCategory));

module.exports = router;
