const Draft = require('../models/draft_model');

const createDraft = async (req, res) => {
    const { userId } = req.user;
    const { head } = req.body;

    const { data: draftId, error, status } = await Draft.createDraft(userId, head);

    if (error) {
        res.status(status).json({ error });
    }

    res.status(200).json({ data: draftId });
};

const getDraftsList = async (req, res) => {
    const { userId } = req.user;

    const { data: drafts, error, status } = await Draft.getDraftsList(userId);

    if (error) {
        res.status(status).json({ error });
    }

    res.status(200).json({ data: drafts });
};

const getDraft = async (req, res) => {
    const { userId } = req.user;
    const { draftId } = req.params;

    if (!draftId) {
        res.status(400).json({ error: 'draftId is required' });
        return;
    }

    const { data, error, status } = await Draft.getDraft(userId, draftId);
    if (error) {
        res.status(status).json({ error });
        return;
    }

    res.status(200).json({ data });
};

const updateDraft = async (req, res) => {
    const { userId } = req.user;
    const { draftId } = req.params;
    const { updateData } = req.body;

    if (!draftId || !updateData) {
        res.status(400).json({ error: 'draftId and updateData are required' });
        return;
    }

    const { data, error, status } = await Draft.updateDraft({ userId, draftId, updateData });

    if (error) {
        res.status(status).json({ error });
        return;
    }

    res.status(200).json({ data: 'ok' });
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
