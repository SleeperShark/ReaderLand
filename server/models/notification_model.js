const { Notification, User, Article, ObjectId } = require('./schemas');

function ISOTimestamp() {
    return new Date().toISOString();
}

const pushFollowNotification = async (followeeId, followerId, io) => {
    try {
        const newNotification = { type: 'follow', subject: ObjectId(followeeId), createdAt: ISOTimestamp(), isread: false };
        const { unread: unreadCount } = await Notification.findByIdAndUpdate(
            followerId,
            {
                $inc: { unread: 1 },
                $push: { notifications: newNotification },
            },
            { new: true, projection: { unread: 1 } }
        );
        const { name } = await User.findById(Object(followeeId), { name: 1 });
        newNotification.subject = { _id: followeeId.toString(), name };

        console.log('Successfully push notification to follower...');

        const socketId = io.usersId_socketId[followerId.toString()];
        if (socketId) {
            console.log('Push new follow notification to ' + socketId);
            io.to(socketId).emit('update-notification', JSON.stringify({ unreadCount, update: { prepend: newNotification } }));
        }
    } catch (error) {
        console.error(error);
    }
};

const pullFollowNotification = async (followerId, followeeId, io) => {
    try {
        let result = await Notification.aggregate([
            { $match: { _id: ObjectId(followerId) } },
            {
                $project: {
                    followNotification: {
                        $filter: {
                            input: '$notifications',
                            as: 'notification',
                            cond: { $and: [{ $eq: ['$$notification.type', 'follow'] }, { $eq: ['$$notification.subject', followeeId] }] },
                        },
                    },
                },
            },
        ]);

        const [{ followNotification: record }] = JSON.parse(JSON.stringify(result));
        const updateObject = { $pull: { notifications: { $and: [{ type: 'follow' }, { subject: followeeId }] } } };
        await Notification.updateOne({ _id: followerId }, updateObject);

        if (record[record.length - 1].hasOwnProperty('isread')) {
            await Notification.updateOne({ _id: followerId }, [{ $set: { unread: { $cond: { if: { $eq: ['$unread', 0] }, then: 0, else: { $subtract: ['$unread', 1] } } } } }]);
        }

        const { unread } = await Notification.findById(followerId, { unread: 1 });

        //Update new unread count to header
        const msg = { unreadCount: unread, update: { remove: { type: 'follow', subject: { _id: followeeId.toString() } } } };

        const socketId = io.usersId_socketId[followerId.toString()];
        if (socketId) {
            io.to(socketId).emit('update-notification', JSON.stringify(msg));
        }
        return;
    } catch (error) {
        console.error('[ERRPR]: pullFollowNotification');
        console.error(error);
    }
};

const newPostNotification = async (article, io) => {
    const { followee: followees, name } = await User.findById(article.author, { followee: 1, name: 1 });

    const newNotification = { type: 'newPost', subject: article.author, articleId: article._id, createdAt: ISOTimestamp(), isread: false };

    for (let followee of followees) {
        try {
            const { unread: unreadCount } = await Notification.findByIdAndUpdate(
                followee,
                {
                    $inc: { unread: 1 },
                    $push: { notifications: newNotification },
                },
                { new: true, projection: { unread: 1 } }
            );

            //TODO: send to online followee
            let socketId = io.usersId_socketId[followee.toString()];

            if (socketId) {
                const authorId = newNotification.subject.toString();
                newNotification.subject = { _id: authorId, name };
                io.to(socketId).emit('update-notification', JSON.stringify({ unreadCount, update: { prepend: newNotification } }));
            }
        } catch (error) {
            console.error(`[ERROR] newPostNotification to user ${followee.toString()}`);
            console.error(error);
        }
    }
    console.log('Finish push new post Notification...');
};

const commentNotification = async (articleId, readerId, io) => {
    try {
        const newNotification = { type: 'comment', subject: ObjectId(readerId), articleId: ObjectId(articleId), createdAt: ISOTimestamp(), isread: false };
        const { author: authorId } = await Article.findById(articleId, { _id: 0, author: 1 });

        const { unread: unreadCount } = await Notification.findByIdAndUpdate(
            ObjectId(authorId),
            {
                $inc: { unread: 1 },
                $push: { notifications: newNotification },
            },
            { new: true, projection: { unread: 1 } }
        );
        console.log('Finish pushing comment Notification to Author...');

        // TODO: use socket to push new notification

        const socketId = io.usersId_socketId[authorId];
        if (socketId) {
            console.log('Push new comment notification to ' + socketId);

            const subject = await User.findById(ObjectId(readerId), { name: 1, _id: 1 });
            newNotification.subject = subject;

            io.to(socketId).emit('update-notification', JSON.stringify({ unreadCount, update: { prepend: newNotification } }));
        }
    } catch (error) {
        console.error('ERROR: commentNotification');
        console.error(error);
    }
};

const replyNotification = async ({ articleId, commentId }, io) => {
    try {
        const [{ reader: readerId, author: authorId }] = await Article.aggregate([
            { $match: { _id: ObjectId(articleId) } },
            {
                $project: {
                    _id: 0,
                    author: 1,
                    comment: { $arrayElemAt: [{ $filter: { input: '$comments', as: 'comment', cond: { $eq: ['$$comment._id', ObjectId(commentId)] } } }, 0] },
                },
            },
            { $project: { author: 1, reader: '$comment.reader' } },
        ]);

        const newNotification = { type: 'reply', subject: ObjectId(authorId), articleId: ObjectId(articleId), createdAt: ISOTimestamp(), isread: false };

        const { unread: unreadCount } = await Notification.findByIdAndUpdate(
            ObjectId(readerId),
            {
                $inc: { unread: 1 },
                $push: { notifications: newNotification },
            },
            { new: true, projection: { unread: 1 } }
        );
        console.log('Finish pushing Reply Notification...');

        const socketId = io.usersId_socketId[readerId.toString()];
        if (socketId) {
            console.log('Push new reply notification to ' + socketId);

            const subject = await User.findById(ObjectId(authorId), { name: 1, _id: 1 });
            newNotification.subject = subject;

            io.to(socketId).emit('update-notification', JSON.stringify({ unreadCount, update: { prepend: newNotification } }));
        }
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

        let [{ notifications, length, subject_info, unread }] = await Notification.aggregate([
            { $match: { _id: ObjectId(userId) } },
            {
                $project: {
                    _id: 1,
                    notifications: {
                        $slice: ['$notifications', { $subtract: [{ $size: '$notifications' }, offset + 10] }, 10],
                    },
                    length: { $size: '$notifications' },
                    unread: 1,
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

        // Update notification if is not firseloaded
        if (offset != 0) {
            const unsetObj = {};
            const start = length - offset - 10;
            for (let i = 0; i < 10; i++) {
                const key = `notifications.${start + i}.isread`;
                unsetObj[key] = '';
            }
            await Notification.findByIdAndUpdate(userId, { $unset: unsetObj });
        }

        return { data: { notifications, length, unread } };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const clearUnread = async (userId, clearnum) => {
    // Get total length of Notifications
    let result = await Notification.findById(userId, { length: { $size: '$notifications' } });
    let { length } = JSON.parse(JSON.stringify(result));

    const unsetObj = {};
    const start = length - clearnum;
    for (let i = 0; i < clearnum; i++) {
        const key = `notifications.${start + i}.isread`;
        unsetObj[key] = '';
    }

    await Notification.findByIdAndUpdate(userId, { $unset: unsetObj, $set: { unread: 0 } });
};

module.exports = { pushFollowNotification, pullFollowNotification, newPostNotification, commentNotification, replyNotification, getUnreadCount, getNotifications, clearUnread };
