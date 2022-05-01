const { Notification, User, Article } = require('./schemas');

function ISOTimestamp() {
    return new Date().toISOString();
}

const followNotification = async (followeeId, followerId) => {
    console.log(followerId);
    console.log(followeeId);

    Notification.findByIdAndUpdate(followerId, { $push: { notifications: { type: 'follow', subject: followeeId, createdAt: ISOTimestamp() } } }, {}, (err) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Successfully push notification to follower...');
    });
};

const newPostNotification = async (authorId, articleId) => {
    const { followee: followees } = await User.findById(authorId, { _id: 0, followee: 1 });
    const timestamp = ISOTimestamp();

    for (let followee of followees) {
        try {
            await Notification.updateOne({ _id: followee }, { $push: { notifications: { type: 'newPost', subject: authorId, articleId, createdAt: timestamp } } });
        } catch (error) {
            console.error(error);
        }
    }
    console.log('Finish New Post Notification...');
};

const commentNotification = async (articleId, readerId) => {
    try {
        const { author: authorId } = await Article.findById(articleId, { _id: 0, author: 1 });

        await Notification.updateOne({ _id: authorId }, { $push: { notifications: { type: 'comment', subject: readerId, articleId, createdAt: ISOTimestamp() } } });
        console.log('Finish comment Notification to Author...');
    } catch (error) {
        console.error('ERROR: commentNotification');
        console.error(error);
    }
};

const replyNotification = async (articleId, commentId) => {
    try {
        const [{ reader, author }] = await Article.aggregate([
            { $match: { _id: articleId } },
            { $project: { _id: 0, author: 1, comment: { $arrayElemAt: [{ $filter: { input: '$comments', as: 'comment', cond: { $eq: ['$$comment._id', commentId] } } }, 0] } } },
            { $project: { author: 1, reader: '$comment.reader' } },
        ]);

        await Notification.updateOne({ _id: reader }, { $push: { notifications: { type: 'reply', subject: author, articleId, createdAt: ISOTimestamp() } } });
        console.log('Finish Reply Notification...');
    } catch (error) {
        console.error('ERROR: replyNotification');
        console.error(error);
    }
};

module.exports = { followNotification, newPostNotification, commentNotification, replyNotification };
