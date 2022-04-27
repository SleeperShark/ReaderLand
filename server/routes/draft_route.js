const router = require('express').Router();
const { createDraft } = require('../controllers/draft_controller');
const { USER_ROLE } = require('../models/user_model');
const { authentication, wrapAsync } = require('../../util/util');

router.route('/drafts').post(authentication(USER_ROLE.ALL), wrapAsync(createDraft));

module.exports = router;
