require('dotenv');
const { User, Article } = require(`${__dirname}/../server/models/schemas`);
const { articleWeightCounter } = require(`${__dirname}/util`);

const Cache = require(`${__dirname}/cache`);

async function pullNewsFeed() {
    const newsfeedKeys = await Cache.keys('*_newsfeed');

    for (let feedKey of newsfeedKeys) {
        const userId = feedKey.split('_')[0];
        const timestampKey = userId + '_timestamp';
        let timeStamp = await Cache.get(timestampKey);
        timeStamp = new Date(Number(timeStamp)).toISOString();

        //TODO: collect Article After this time stamp
        const { subscribe, follower } = await User.findById(userId, { follower: 1, subscribe: 1 });
        const pullArticles = await Article.find(
            { createdAt: { $gte: timeStamp }, author: { $nin: follower }, category: { $in: Object.keys(subscribe) } },
            { _id: 1, category: 1, createdAt: 1, readCount: 1, likeCount: { $size: '$likes' }, commentCount: { $size: '$comments' } }
        );

        // count article weight

        for (let article of pullArticles) {
            console.log(articleWeightCounter(article, { subscribe }));
        }
    }
}

pullNewsFeed();
