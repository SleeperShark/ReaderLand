const router = require('express').Router();
const { USER_ROLE } = require('../models/user_model');
const { authentication, wrapAsync } = require('../../util/util');
const { createDraft, updateDraft } = require('../controllers/draft_controller');

router.route('/drafts').post(authentication(USER_ROLE.ALL), wrapAsync(createDraft));
router.route('/drafts/:draftId').put(authentication(USER_ROLE.ALL), wrapAsync(updateDraft));

module.exports = router;
