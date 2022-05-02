const { Notification, User, Article, ObjectId } = require('./schemas');

function ISOTimestamp() {
    return new Date().toISOString();
}

const followNotification = async (followeeId, followerId) => {
    try {
        await Notification.updateOne(
            { _id: followerId },
            { $inc: { unread: 1 }, $push: { notifications: { type: 'follow', subject: ObjectId(followeeId), createdAt: ISOTimestamp(), isread: false } } }
        );

        console.log('Successfully push notification to follower...');
    } catch (error) {
        console.error(error);
    }
};

const newPostNotification = async (authorId, articleId) => {
    const { followee: followees } = await User.findById(authorId, { _id: 0, followee: 1 });
    const timestamp = ISOTimestamp();

    for (let followee of followees) {
        try {
            await Notification.updateOne(
                { _id: followee },
                {
                    $inc: { unread: 1 },
                    $push: { notifications: { type: 'newPost', subject: ObjectId(authorId), articleId: ObjectId(articleId), createdAt: timestamp, isread: false } },
                }
            );
        } catch (error) {
            console.error(error);
        }
    }
    console.log('Finish New Post Notification...');
};

const commentNotification = async (articleId, readerId) => {
    try {
        const { author: authorId } = await Article.findById(articleId, { _id: 0, author: 1 });

        await Notification.updateOne(
            { _id: authorId },
            {
                $inc: { unread: 1 },
                $push: { notifications: { type: 'comment', subject: ObjectId(readerId), articleId: ObjectId(articleId), createdAt: ISOTimestamp(), isread: false } },
            }
        );
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

        await Notification.updateOne(
            { _id: reader },
            {
                $inc: { unread: 1 },
                $push: { notifications: { type: 'reply', subject: ObjectId(author), articleId: ObjectId(articleId), createdAt: ISOTimestamp(), isread: false } },
            }
        );
        console.log('Finish Reply Notification...');
    } catch (error) {
        console.error('ERROR: replyNotification');
        console.error(error);
    }
};

const getUnreadCount = async (userId) => {
    try {
        const { unread } = await Notification.findById(userId, { unread: 1, _id: 0 });

        return { data: unread };
    } catch (error) {
        console.error('Error: getUnreadCount');
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const getNotifications = async (userId, offset) => {
    try {
        offset;

        let [{ notifications, length, subject_info }] = await Notification.aggregate([
            { $match: { _id: userId } },
            {
                $project: {
                    _id: 1,
                    notifications: {
                        $slice: ['$notifications', { $subtract: [{ $size: '$notifications' }, offset + 10] }, 10],
                    },
                    length: { $size: '$notifications' },
                },
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'notifications.subject',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                            },
                        },
                    ],
                    as: 'subject_info',
                },
            },
        ]);

        // Process subject info into notification
        subject_info = subject_info.reduce((prev, curr) => {
            prev[curr._id.toString()] = curr;
            return prev;
        }, {});

        notifications.forEach((elem) => {
            elem.subject = subject_info[elem.subject.toString()];
        });

        // Update notification unread state
        await Notification.updateOne({ _id: userId }, { $set: { unread: 0 } });

        return { data: { notifications, length } };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

module.exports = { followNotification, newPostNotification, commentNotification, replyNotification, getUnreadCount, getNotifications };
