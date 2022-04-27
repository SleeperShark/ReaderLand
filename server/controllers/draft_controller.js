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

const updateDraft = async (req, res) => {
    const { userId } = req.user;
    const { draftId } = req.params;
    const { updateData } = req.body;

    if (!draftId || !updateData) {
        res.status(400).json({ error: 'draftId and updateData is required' });
        return;
    }

    const { data, error, status } = await Draft.updateDraft({ userId, draftId, updateData });

    if (error) {
        res.status(status).json({ error });
        return;
    }

    res.status(200).json({ data: 'ok' });
};

module.exports = {
    createDraft,
    updateDraft,
};
