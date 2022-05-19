require('dotenv').config();
const { Draft, ObjectId } = require('./schemas');

const createDraft = async (userId, head) => {
    const context = {};
    context[head] = {
        type: 'text',
        content: '',
    };

    try {
        const draft = await Draft.create({
            author: userId,
            head,
            createdAt: new Date(Number(head)).toISOString(),
            lastUpdatedAt: new Date(Number(head)).toISOString(),
            context,
            title: '',
        });

        console.log('Successfully creating new draft: ' + draft._id.toString());

        return { data: draft._id.toString() };
    } catch (error) {
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const getDraftsList = async (userId) => {
    try {
        const drafts = await Draft.find({ author: userId }, { _id: 1, createdAt: 1, lastUpdatedAt: 1, title: 1 });

        return { data: drafts };
    } catch (error) {
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const updateDraft = async ({ userId, draftId, updateData }) => {
    if (!ObjectId.isValid(draftId)) {
        return { error: 'Invalid draftId.', status: 400 };
    }

    updateData['lastUpdatedAt'] = new Date().toISOString();

    try {
        const { matchedCount } = await Draft.updateOne({ _id: ObjectId(draftId), author: userId }, updateData, { upsert: true });

        if (!matchedCount) {
            console.error('Unmatched draft info.');
            return { status: 400, error: 'Unmatched draft info.' };
        }

        console.log('Successfully updated draft...');

        return { data: { draftId, lastUpdatedAt: updateData.lastUpdatedAt } };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const getDraft = async (userId, draftId) => {
    if (!ObjectId.isValid(draftId)) {
        console.error('Invalid draftId');
        return { error: 'Invalid draftId.', status: 400 };
    }

    try {
        const draft = await Draft.findById(ObjectId(draftId), { author: 1, context: 1, head: 1, title: 1 });
        if (!draft) {
            console.error('No matched draft');
            return { error: 'No matched draft', status: 400 };
        }

        if (draft.author.toString() != userId.toString()) {
            console.error('Unmatched author.');
            return { error: "You don't have the access to the draft.", status: 403 };
        }

        return { data: draft };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const deleteDraft = async (userId, draftId) => {
    if (!ObjectId.isValid(draftId)) {
        console.error('Invalid draftId');
        return { error: 'Invalid draftId.', status: 400 };
    }

    try {
        const { deletedCount } = await Draft.deleteOne({ _id: ObjectId(draftId), author: userId });

        if (!deletedCount) {
            console.error('Unmatched draftId or author.');
            return { error: 'Unmatched draftId or author.', status: 400 };
        }

        console.log(`Successfully delete the draft: ${draftId}...`);

        return { data: draftId };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

module.exports = {
    createDraft,
    getDraftsList,
    updateDraft,
    getDraft,
    deleteDraft,
};
