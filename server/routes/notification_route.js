const router = require('express').Router();
const { USER_ROLE } = require('../models/user_model');
const { wrapAsync } = require('../../util/util');
const { authentication } = require('../models/user_model');

const { getUnreadCount, getNotifications } = require('../controllers/notification_controller');

router.route('/notifications/unreadCount').get(authentication(USER_ROLE.ALL), wrapAsync(getUnreadCount));
router.route('/notifications/:offset').get(authentication(USER_ROLE.ALL), wrapAsync(getNotifications));

module.exports = router;
