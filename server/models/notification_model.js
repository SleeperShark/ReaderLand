const { Notification, User } = require('./schemas');

const followNotification = async (followeeId, followerId) => {
    console.log(followerId);
    console.log(followeeId);

    Notification.findByIdAndUpdate(followerId, { $push: { notifications: { type: 'follow', subject: followeeId, createdAt: new Date().toISOString() } } }, {}, (err) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Successfully push notification to follower...');
    });
};

const newPostNotification = async (authorId, articleId) => {
    const { followee: followees } = await User.findById(authorId, { _id: 0, followee: 1 });
    const timestamp = new Date().toISOString();

    for (let followee of followees) {
        try {
            await Notification.updateOne({ _id: followee }, { $push: { notifications: { type: 'newPost', subject: authorId, articleId, createdAt: timestamp } } });
        } catch (error) {
            console.error(error);
        }
    }
    console.log('Finish New Post Notification...');
};

module.exports = { followNotification, newPostNotification };
