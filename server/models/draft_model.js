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

module.exports = {
    createDraft,
};
