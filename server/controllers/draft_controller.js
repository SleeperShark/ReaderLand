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

module.exports = {
    createDraft,
};
