const router = require('express').Router();
const { USER_ROLE } = require('../models/user_model');
const { authentication, wrapAsync } = require('../../util/util');
const { createDraft, updateDraft, getDraft, deleteDraft } = require('../controllers/draft_controller');

router.route('/drafts').post(authentication(USER_ROLE.ALL), wrapAsync(createDraft));

router.route('/drafts/:draftId').get(authentication(USER_ROLE.ALL), wrapAsync(getDraft));
router.route('/drafts/:draftId').put(authentication(USER_ROLE.ALL), wrapAsync(updateDraft));
router.route('/drafts/:draftId').delete(authentication(USER_ROLE.ALL), wrapAsync(deleteDraft));

module.exports = router;
