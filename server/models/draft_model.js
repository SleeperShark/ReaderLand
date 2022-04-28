require('dotenv').config();
const { Draft, ObjectId, User } = require('./schemas');

const createDraft = async (userId, head) => {
    const context = {};
    context[head] = {
        type: 'text',
        content: '',
        next: undefined,
    };
    try {
        const draft = await Draft.create({
            author: userId,
            head,
            createdAt: new Date(Number(head)).toISOString(),
            context,
            title: '無標題',
        });

        console.log('Successfully creating new draft: ' + draft._id.toString());

        return { data: draft._id.toString() };
    } catch (error) {
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const updateDraft = async ({ userId, draftId, updateData }) => {
    if (!ObjectId.isValid(draftId)) {
        return { error: 'Invalid draftId.', status: 400 };
    }

    try {
        const result = await Draft.updateOne({ _id: ObjectId(draftId), author: userId }, { $set: updateData }, { upsert: true });

        console.log(result);
        console.log(updateData);

        if (!result.matchedCount) {
            console.error('Unmatched draft info.');
            console.log(updateData);
            return { status: 400, error: 'Unmatched draft info.' };
        }

        return { data: 'OK' };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

module.exports = {
    createDraft,
    updateDraft,
};
