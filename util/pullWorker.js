require('dotenv').config({ path: __dirname + '/../.env' });
const { User: UserSchema, Article: ArticleSchema } = require(`${__dirname}/../server/models/schemas`);
const ArticleModel = require(`${__dirname}/../server/models/article_model`);
const { articleWeightCounter } = require(`${__dirname}/util`);
const Cache = require(`${__dirname}/cache`);
const { INSERT_STRATEGY } = process.env;

function randomDistribute(small, large) {
    const tempArr = [];
    let rand = [];

    for (let i = 0; i < large.length; i++) {
        tempArr.push(i);
    }

    for (let i = 0; i < small.length; i++) {
        const j = Math.floor(Math.random() * tempArr.length);
        rand.push(tempArr[j]);
        tempArr.splice(j, 1);
    }

    rand.sort((a, b) => a - b);

    const newArr = [];
    let lastPos = 0;
    for (let i = 0; i < small.length; i++) {
        const pos = rand[i];
        newArr.push(...large.slice(lastPos, pos), small[i]);

        lastPos = pos;
    }
    newArr.push(...large.slice(lastPos, large.length));

    return newArr;
}

function evenlyDistribute(small, large) {
    let newArr = [];
    const interval = parseInt(large.length / small.length);

    //TODO: method A: distributed evenly
    for (let i = 0; i < small.length; i++) {
        const insertTarget = small[i];
        const subArr = large.slice(i * interval, (i + 1) * interval);
        const pos = Math.floor(Math.random() * interval);

        newArr.push(...subArr.slice(0, pos), insertTarget, ...subArr.slice(pos, interval));
    }
    newArr.push(...large.slice(interval * small.length, large.length));
    return newArr;
}

function Insertfeeds(newsfeed, pullfeed) {
    let large, small;

    if (newsfeed.length > pullfeed.length) {
        large = newsfeed;
        small = pullfeed;
    } else {
        large = pullfeed;
        small = newsfeed;
    }

    let newArr;

    switch (INSERT_STRATEGY) {
        case '1':
            console.log('Insert Strategy: Random');
            newArr = randomDistribute(small, large);
            break;

        case '2':
            console.log('Insert Strategy: Even');
            newArr = evenlyDistribute(small, large);
            break;
        default:
            console.error(new Date().toISOString());
            console.error('ERROR: Please specify shuffle policy');
    }

    return newArr;
}

async function pullNewsFeed() {
    const newsfeedKeys = await Cache.keys('*_newsfeed');

    for (let feedKey of newsfeedKeys) {
        const userId = feedKey.split('_')[0];
        console.log(`Pulling new articles for User ${userId}`);

        try {
            const timestampKey = userId + '_timestamp';
            let timeStamp = await Cache.get(timestampKey);

            //TODO: collect Article After this time stamp
            const { subscribe, follower } = await UserSchema.findById(userId, { follower: 1, subscribe: 1 });

            if (!subscribe || !Object.keys(subscribe).length) {
                console.log('No preference, skip this user...');
            }

            let pullArticles = await ArticleSchema.find(
                { createdAt: { $gte: timeStamp }, author: { $nin: follower }, category: { $in: Object.keys(subscribe) } },
                { _id: 1, author: 1, category: 1, createdAt: 1, readCount: 1, likeCount: { $size: '$likes' }, commentCount: { $size: '$comments' } }
            );
            const currTimestamp = new Date().toISOString();

            if (!pullArticles.length) {
                console.log('No new articles for user...');
                continue;
            }

            pullArticles = JSON.parse(JSON.stringify(pullArticles));

            // count article weight
            for (let article of pullArticles) {
                article.weight = articleWeightCounter(article, { subscribe, follower });
            }
            pullArticles.sort((a, b) => b.weight - a.weight);
            pullArticles = pullArticles.map((elem) => elem._id.toString());

            //TODO: insert new article into news feed
            const newsFeed = await Cache.lrange(`${userId}_newsfeed`, 0, -1);

            const inertedArray = Insertfeeds(newsFeed, pullArticles);
            await Cache.del(`${userId}_newsfeed`);
            await Cache.rpush(`${userId}_newsfeed`, ...inertedArray);
            await Cache.set(`${userId}_timestamp`, currTimestamp);

            if (!inertedArray) {
                console.log('No Shuffle Policy, Dropping the task...');
                break;
            }

            console.log('insert before: ' + newsFeed.length);
            console.log('pull length: ' + pullArticles.length);
            console.log('insert after: ' + inertedArray.length);
        } catch (error) {
            console.log('[ERROR]: pulling feed for user ' + userId);
            console.error(new Date().toISOString());
            console.error(error);
            console.error();
        }
    }
}

async function regenerateNewsfeed() {
    //TODO: get all user's newsfeed key in cache
    let usersId = await Cache.keys('*_newsfeed');
    usersId = usersId.map((elem) => elem.split('_')[0]);

    for (let i = 0; i < usersId.length; i++) {
        try {
            console.log(`Regenerate User ${usersId[i]}'s newsfeed...`);
            const preference = await UserSchema.findById(usersId[i], { follower: 1, subscribe: 1 });
            await ArticleModel.generateNewsFeedInCache({ userId: usersId[i], preference });
        } catch (error) {
            console.log('[ERROR]: error in generate newsfeed for user ' + usersId[i]);
            console.error(new Date().toISOString());
            console.error(error);
            console.error();
        }
    }

    return;
}

async function main() {
    console.log(`${new Date().toISOString()}: Newsfeed Maintainer awake...`);
    console.time();

    console.log(process.env.CACHE_PASSWORD);

    //Sleep a while for redis connecction
    await new Promise((r) => {
        setTimeout(() => {
            console.log('Waiting for Redis Connection...');
            r();
        }, 2000);
    });

    if (!Cache.ready) {
        console.error(new Date().toISOString());
        console.error('ERROR: Cache conneted failed, please check redis status...');
        return;
    }

    await pullNewsFeed();

    console.log('Task finish...');
    console.timeEnd();
    console.log('');

    process.exit();
}

main();
