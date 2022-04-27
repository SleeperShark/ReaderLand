require('dotenv').config();
const { Draft, ObjectId, User } = require('./schemas');

const createDraft = async (userId, head) => {
    try {
        const draft = await Draft.create({
            author: userId,
            head,
            createdAt: new Date(Number(head)).toISOString(),
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
        const result = await Draft.updateOne({ _id: ObjectId(draftId), author: userId }, { $set: updateData });
        console.log(result);
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
