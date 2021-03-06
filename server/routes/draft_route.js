const router = require('express').Router();

const { USER_ROLE } = require('../models/user_model');

const { wrapAsync } = require('../../util/util');

const { authentication } = require('../models/user_model');

const { createDraft, updateDraft, getDraft, deleteDraft, getDraftsList } = require('../controllers/draft_controller');

router.route('/drafts').post(authentication(USER_ROLE.ALL), wrapAsync(createDraft));

router.route('/drafts').get(authentication(USER_ROLE.ALL), wrapAsync(getDraftsList));

router.route('/drafts/:draftId').get(authentication(USER_ROLE.ALL), wrapAsync(getDraft));

router.route('/drafts/:draftId').put(authentication(USER_ROLE.ALL), wrapAsync(updateDraft));

router.route('/drafts/:draftId').delete(authentication(USER_ROLE.ALL), wrapAsync(deleteDraft));

module.exports = router;
