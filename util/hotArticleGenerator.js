const timespan = require('jsonwebtoken/lib/timespan');

require('dotenv').config({ path: __dirname + '/../.env' });
const { Article } = require(`${__dirname}/../server/models/schemas`);
const Cache = require(`${__dirname}/cache`);
const { READ_WEIGHT, READ_DIVISION, LIKE_WEIGHT, LIKE_DIVISION, COMMENT_WEIGHT, COMMENT_DIVISION } = process.env;

async function generateHotArticles() {
    try {
        console.log('Waiting for DB and cache to connect...');
        await new Promise((r) => {
            setTimeout(() => {
                r();
            }, 1000);
        });

        if (!Cache.ready) {
            console.log('[ERROR] cache failed, skip generateHotArticles...');
            return;
        }

        //TODO: Getting hot articles
        let dateLimit = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7).toISOString();

        console.log('Querying hot Articles...');
        let hotArticles = await Article.aggregate([
            { $match: { createdAt: { $gte: new Date(dateLimit) } } },
            {
                $addFields: {
                    weight: {
                        $multiply: [
                            { $pow: [{ $toDouble: READ_WEIGHT }, { $divide: ['$readCount', { $toInt: READ_DIVISION }] }] },
                            { $pow: [{ $toDouble: LIKE_WEIGHT }, { $divide: [{ $size: '$likes' }, { $toInt: LIKE_DIVISION }] }] },
                            { $pow: [{ $toDouble: COMMENT_WEIGHT }, { $divide: [{ $size: '$comments' }, { $toInt: COMMENT_DIVISION }] }] },
                        ],
                    },
                },
            },
            {
                $sort: { weight: -1 },
            },
            {
                $limit: 5,
            },
            {
                $lookup: { from: 'User', localField: 'author', foreignField: '_id', pipeline: [{ $project: { name: 1, _id: 1 } }], as: 'author' },
            },
            {
                $project: { _id: 1, title: 1, author: { $arrayElemAt: ['$author', 0] }, createdAt: 1 },
            },
        ]);

        //TODO: process articles id to String
        hotArticles = JSON.parse(JSON.stringify(hotArticles));
        hotArticles = hotArticles.map((elem) => {
            elem._id = elem._id.toString();
            elem.author._id = toString();
            return JSON.stringify(elem);
        });

        console.log('Storing hot articles to cache...');

        await Cache.del('hot_articles');
        await Cache.rpush('hot_articles', hotArticles);

        console.log('Finish generating hot articles...');
    } catch (error) {
        const timestamp = new Date().toISOString();
        console.log(`[ERROR]: generateHotArticles at ${timestamp}`);
        console.error(`${timespan}`);
        console.error(error + '\n');
    }
}

module.exports = { generateHotArticles };
