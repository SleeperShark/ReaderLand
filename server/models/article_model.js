require('dotenv').config();
const { READ_WEIGHT, READ_DIVISION, LIKE_WEIGHT, LIKE_DIVISION, COMMENT_WEIGHT, COMMENT_DIVISION } = process.env;
const { Article, ObjectId, User } = require('./schemas');
const { timeDecayer } = require('../../util/util');
const Cache = require('../../util/cache');

const fs = require('fs');

const createArticle = async (articleInfo) => {
    try {
        const article = await Article.create(articleInfo);
        console.log(article);

        return { article };
    } catch (error) {
        console.log(error);
        let status;
        if (error.message.includes('duplicate')) {
            status = 400;
        }

        return { error: error.message, status };
    }
};

const getFullArticle = async (articleId) => {
    try {
        const article = await Article.aggregate([
            { $match: { _id: new ObjectId(articleId) } },
            {
                $lookup: {
                    from: 'User',
                    localField: 'author',
                    foreignField: '_id',
                    pipeline: [{ $project: { _id: 0, name: 1, picture: 1 } }],
                    as: 'author',
                },
            },
            // { $project: { title: 1, author: '$author_info.name', context: 1, createdDate: 1 } },
            // { $replaceRoot: { newRoot: { $mergeObjects: [{ $arrayElemAt: ['$author', 0] }, '$$ROOT'] } } },
            { $project: { author: 1, title: 1, context: 1, createdAt: 1, readCount: 1, likes: 1, category: 1, comments: 1 } },
        ]);
        console.log(article);
        if (!article.length) {
            return { error: 'No matched article.', status: 400 };
        }
        return { article };
    } catch (error) {
        console.log(error);
        return { error: error.message, status: 500 };
    }
};

const generateNewsFeed = async (userId) => {
    try {
        // acquire user's follower and subscribe categories
        const userPreference = await User.findById(userId, { subscribe: 1, follower: 1, _id: 0 });
        let { follower, subscribe } = userPreference;

        const newsfeedMaterial = [];
        let skip = 0;
        const limitInterval = 100;

        // collect over 200 prefered article
        while (newsfeedMaterial.length < 200) {
            const feeds = await Article.aggregate([
                {
                    $sort: { _id: -1 },
                },
                {
                    $skip: skip,
                },
                {
                    $limit: limitInterval,
                },
                {
                    $match: { $or: [{ author: { $in: follower } }, { category: { $in: Object.keys(subscribe) } }] },
                },
                {
                    $lookup: {
                        from: 'User',
                        localField: 'author',
                        foreignField: '_id',
                        pipeline: [{ $project: { _id: 1, name: 1, picture: 1 } }],
                        as: 'author',
                    },
                },
                {
                    $project: {
                        _id: 1,
                        author: { $arrayElemAt: ['$author', 0] },
                        readCount: 1,
                        createdAt: 1,
                        likeCount: { $size: '$likes' },
                        preview: { $substr: ['$context', 0, 150] },
                        commentCount: { $size: '$comments' },
                        category: 1,
                    },
                },
            ]);

            newsfeedMaterial.push(...feeds);
            skip += limitInterval;
        }

        const currTime = new Date();
        // const weightRecord = [];

        // Caclulate weight for each article in newsfeedMaterial
        newsfeedMaterial.forEach(({ author, likeCount, commentCount, readCount, category, createdAt }, idx, arr) => {
            // temp is for recording result to weightRecord.json
            // const temp = {};
            let weight = 0;
            weight += category.reduce((prev, curr) => prev + (subscribe[curr] || 0), 1);

            // temp['category_weight'] = weight;
            // console.log(weight);

            weight *= follower.includes(author._id) ? 3 : 1;
            // temp['weight_with_author'] = weight;

            weight *= Math.pow(READ_WEIGHT, Math.floor(readCount / READ_DIVISION));
            weight *= Math.pow(LIKE_WEIGHT, Math.floor(likeCount / LIKE_DIVISION));
            weight *= Math.floor(COMMENT_WEIGHT, Math.floor(commentCount / COMMENT_DIVISION));

            // temp['affinity'] = [readCount, likeCount, commentCount];
            // temp['weight_with_affinity'] = weight;

            // const timeDecayInMilli = new Date().getTime() - new Date(createdAt).getTime();
            // const timeDecayInMin = Math.floor(timeDecayInMilli / 1000 / 60);
            // const timeDecayInHour = Math.floor(timeDecayInMin / 60);
            // const timeDecayInDay = Math.floor(timeDecayInHour / 24);
            // temp['hour_decay'] = timeDecayInHour;

            const decayWeight = timeDecayer(currTime, createdAt);
            // temp['decayWeight'] = decayWeight;

            weight = (weight / decayWeight).toFixed(3);
            // temp['finalWeight'] = weight;

            // weightRecord.push(temp);
            arr[idx]['weight'] = weight;
        });

        if (Cache.ready) {
            const cacheFeed = [];
            for (let i = 0; i < newsfeedMaterial.length; i += 50) {
                const temp = newsfeedMaterial.slice(i, 50 + i);
                temp.sort((a, b) => b.weight - a.weight);
                cacheFeed.push(...temp.map((elem) => JSON.stringify(elem)));
            }

            await Cache.rpush(`${userId}_newsfeed`, ...cacheFeed);
            return { cache: 1 };
        } else {
            console.log('Cache failed, return top 50 articles according to weight');
            newsfeedMaterial.sort((a, b) => b.weight - a.weight);
            return { feeds: newsfeedMaterial.slice(0, 100) };
        }
    } catch (error) {
        console.log(error);
        return { error: error.message };
    }

    // fs.writeFileSync('weightRecord.json', JSON.stringify(weightRecord));
    // fs.writeFileSync('NewsFeed.json', JSON.stringify(newsfeed));
};

module.exports = { createArticle, getFullArticle, generateNewsFeed };
