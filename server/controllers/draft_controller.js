const Draft = require('../models/draft_model');
const { modelResultResponder } = require(`${__dirname}/../../util/util`);

const createDraft = async (req, res) => {
    const { userId } = req.user;
    const { head } = req.body;

    const result = await Draft.createDraft(userId, head);

    modelResultResponder(result, res);
};

const getDraftsList = async (req, res) => {
    const { userId } = req.user;

    const result = await Draft.getDraftsList(userId);

    modelResultResponder(result, res);
};

const getDraft = async (req, res) => {
    const { userId } = req.user;
    const { draftId } = req.params;

    if (!draftId) {
        res.status(400).json({ error: 'draftId is required' });
        return;
    }

    const result = await Draft.getDraft(userId, draftId);

    modelResultResponder(result, res);
};

const updateDraft = async (req, res) => {
    const { userId } = req.user;
    const { draftId } = req.params;
    const { updateData } = req.body;

    if (!draftId || !updateData) {
        res.status(400).json({ error: 'draftId and updateData are required' });
        return;
    }

    const result = await Draft.updateDraft({ userId, draftId, updateData });

    modelResultResponder(result, res);
};

const deleteDraft = async (req, res) => {
    const { userId } = req.user;
    const { draftId } = req.params;

    if (!draftId) {
        res.status(400).json({ error: 'draftId is required' });
        return;
    }

    const { error, status } = await Draft.deleteDraft(userId, draftId);

    if (error) {
        res.status(status).json({ error });
        return;
    }

    res.status(200).json({ data: 'ok' });
};

module.exports = {
    createDraft,
    getDraftsList,
    getDraft,
    updateDraft,
    deleteDraft,
};
