const router = require('express').Router();
const { USER_ROLE } = require('../models/user_model');
const { authentication, wrapAsync } = require('../../util/util');

const { getUnreadCount } = require('../controllers/notification_controller');

router.route('/notifications/unreadCount').get(authentication(USER_ROLE.ALL), wrapAsync(getUnreadCount));

module.exports = router;
