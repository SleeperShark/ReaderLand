require('dotenv').config();
const { READ_WEIGHT, READ_DIVISION, LIKE_WEIGHT, LIKE_DIVISION, COMMENT_WEIGHT, COMMENT_DIVISION, IMAGE_URL } = process.env;
const { Article, ObjectId, User, Category } = require('./schemas');
const { timeDecayer } = require('../../util/util');
const Cache = require('../../util/cache');

const fs = require('fs');
const res = require('express/lib/response');

const pushToNewsfeed = async (article) => {
    try {
        //TODO: get author's followee list
        const queryResult = await User.findById(article.author, { _id: 0, followee: 1 });
        let followee = queryResult.followee;
        if (!followee.length) {
            return;
        }
        const followeeNum = followee.length;
        //TODO: make followee list match lua format
        followee = followee.map((elem) => elem.toString() + '_newsfeed');
        // console.log(followee);
        const articleId = article._id.toString();
        // console.log(articleId);

        //TODO: push article id to followee's newsfeed
        const keys = ['articleId', 'followeeNum', 'randNom', ...new Array(followeeNum).fill('')];
        const argv = [articleId, followeeNum, Math.floor(Math.random() * 1000), ...followee];
        const luaScript = `
            local articleId = ARGV[1];
            local followeeNum = tonumber(ARGV[2]);
            local randseed = tonumber(ARGV[3]);
            
            math.randomseed(randseed);
            
            for i = 4, followeeNum+3 do
                if (redis.call("EXISTS", ARGV[i]) == 1) then
                    local randIdx = math.random(1, 20)
                    local temp = redis.call("LRANGE", ARGV[i], randIdx, randIdx);
                    redis.call("LINSERT", ARGV[i], "BEFORE", temp[1], articleId);
                end
            end
            
            return;
        `;

        await Cache.eval(luaScript, keys.length, ...keys, ...argv);
        console.log('Successfully push newsfeed to followees...');
        return;
    } catch (error) {
        console.error(error);
        return;
    }
};

const createArticle = async (articleInfo) => {
    // articleInfo: title, author, context, category
    try {
        //TODO: Validate all categories of the article are valid
        let categories = await Category.find({}, { category: 1, _id: 0 });
        categories = categories.map((elem) => elem.category);
        for (let cat of articleInfo.category) {
            if (!categories.includes(cat)) {
                return { error: `Invalid category: ${cat}`, status: 400 };
            }
        }

        const article = await Article.create(articleInfo);
        console.log(`Successfully create article: ${article._id}`);

        // TODO: Insert the new article to followee's newsfeed Queue
        pushToNewsfeed(article);

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

const generateNewsFeed = async (userId, lastArticleId) => {
    try {
        // acquire user's follower and subscribe categories
        console.log(userId);
        const userPreference = await User.findById(userId, { subscribe: 1, follower: 1, _id: 0 });

        let { follower, subscribe } = userPreference;

        const newsfeedMaterial = [];
        let skip;
        if (lastArticleId) {
            skip = await Article.find({ _id: { $gte: ObjectId(lastArticleId) } }).count();
        } else {
            skip = 0;
        }
        const limitInterval = 100;

        // collect over 200 prefered article
        let zeroSearchCount = 0;
        while (newsfeedMaterial.length < 200) {
            console.log(`Skip for the newsfeed retrieval: ${skip}`);
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
                        title: 1,
                        author: { $arrayElemAt: ['$author', 0] },
                        createdAt: 1,
                        preview: 1,
                        readCount: 1,
                        likeCount: { $size: '$likes' },
                        commentCount: { $size: '$comments' },
                        category: 1,
                    },
                },
            ]);

            //* exam whether feeds is empty
            zeroSearchCount += feeds.length === 0 ? 1 : 0;
            if (zeroSearchCount === 3) {
                skip = 0;
                zeroSearchCount = 0;
                console.log('Touch article limit, retry from the top...');
                continue;
            }

            newsfeedMaterial.push(...feeds);
            skip += limitInterval;
        }

        const currTime = new Date();

        // Caclulate weight for each article in newsfeedMaterial
        newsfeedMaterial.forEach(({ author, likeCount, commentCount, readCount, category, createdAt }, idx, arr) => {
            let weight = 0;
            weight += category.reduce((prev, curr) => prev + (subscribe[curr] || 0), 1);

            weight *= follower.includes(author._id) ? 3 : 1;

            weight *= Math.pow(READ_WEIGHT, Math.floor(readCount / READ_DIVISION));
            weight *= Math.pow(LIKE_WEIGHT, Math.floor(likeCount / LIKE_DIVISION));
            weight *= Math.floor(COMMENT_WEIGHT, Math.floor(commentCount / COMMENT_DIVISION));

            const decayWeight = timeDecayer(currTime, createdAt);

            weight = (weight / decayWeight).toFixed(3);

            arr[idx]['weight'] = weight;
        });

        if (Cache.ready) {
            const cacheFeed = [];
            // const record = [];
            for (let i = 0; i < newsfeedMaterial.length; i += 50) {
                const temp = newsfeedMaterial.slice(i, 50 + i);
                temp.sort((a, b) => b.weight - a.weight);

                // record.push(...temp);
                cacheFeed.push(...temp.map((elem) => elem._id));
            }

            // console.log(cacheFeed);

            await Cache.rpush(`${userId}_newsfeed`, ...cacheFeed);
            // fs.writeFileSync('NewsFeed.json', JSON.stringify(record));

            return { cache: 1 };
        } else {
            console.log('Cache failed, return top 100 articles according to weight');
            newsfeedMaterial.sort((a, b) => b.weight - a.weight);
            feeds = newsfeedMaterial.slice(0, 100).map((article) => {
                article.author.picture = `${process.env.IMAGE_URL}/avatar/${article.author.picture}`;
                return article;
            });
            console.log(feeds[0]);
            return { feeds };
        }
    } catch (error) {
        console.log(error);
        return { error: error.message };
    }

    // fs.writeFileSync('weightRecord.json', JSON.stringify(weightRecord));
};

// TODO: get articles preview from customized newsfeed
const getNewsFeed = async (userId) => {
    try {
        //* get 50 feeds back from cache
        const luaScript = `
        local feeds = redis.call('lrange', KEYS[1], 0, 24);
        redis.call('ltrim', KEYS[1], 25, -1);

        local left = redis.call('lrange', KEYS[1], 0, -1);
        return {feeds, #left};
        `;
        let [feedsId, left] = await Cache.eval(luaScript, 1, userId + '_newsfeed');

        // if the rest less than 25 articles => retrieve more articles to news feed
        if (left < 25) {
            const lastArticleId = feedsId[feedsId.length - 1];
            generateNewsFeed(userId, lastArticleId);
        }

        // TODO: get articles preview from articleId
        feedsId = feedsId.map((elem) => ObjectId(elem));
        let feeds = await Article.aggregate([
            {
                $match: { _id: { $in: feedsId } },
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
                    title: 1,
                    author: { $arrayElemAt: ['$author', 0] },
                    preview: 1,
                    createdAt: 1,
                    readCount: 1,
                    likes: 1,
                    comments: 1,
                    category: 1,
                },
            },
        ]);

        //TODO: organize article preview to customized feed order
        const temp = {};
        let result = await User.findById(userId, { _id: 0, favorite: { articleId: 1 } });
        const favorite = result.favorite.map((elem) => elem.articleId.toString());

        feeds.forEach((elem) => {
            // making {id: article} Object
            temp[elem._id.toString()] = elem;

            // processing article data
            elem.author.picture = `${IMAGE_URL}/avatar/${elem.author.picture}`;

            // check favorited
            if (favorite.includes(elem._id.toString())) {
                elem.favorited = true;
            }

            // check liked
            for (let likeUser of elem.likes) {
                if (likeUser.toString() == userId.toString()) {
                    {
                        elem.liked = true;
                        break;
                    }
                }
            }
            elem.likeCount = elem.likes.length;
            delete elem.likes;

            // check commented
            for (let comment of elem.comments) {
                if (comment.reader.toString() == userId.toString()) {
                    elem.commented = true;
                    break;
                }
            }
            elem.commentCount = elem.comments.length;
            delete elem.comment;
        });
        feeds = feedsId.map((elem) => temp[elem.toString()]);

        return feeds;
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

// TODO: push userId to Article.likes array
const likeArticle = async (userId, articleId) => {
    //* examine the articleId format
    try {
        articleId = ObjectId(articleId);
    } catch (error) {
        console.error(error);
        return { error: 'ArticleId format error', status: 400 };
    }

    try {
        //* Check if Article exist
        const exist = await Article.countDocuments({ _id: articleId });
        if (!exist) {
            return { error: "Article doesn't exist.", status: 400 };
        }

        await Article.updateOne({ _id: articleId }, [
            {
                $set: {
                    likes: {
                        $cond: {
                            if: { $in: [userId, '$likes'] },
                            then: '$likes',
                            else: { $concatArrays: ['$likes', [userId]] },
                        },
                    },
                },
            },
        ]);
        console.log("Push userId to article's likes array...");

        return { like: 1 };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const unlikeArticle = async (userId, articleId) => {
    //* examine the articleId format
    try {
        articleId = ObjectId(articleId);
    } catch (error) {
        console.error(error);
        return { error: 'ArticleId format error', status: 400 };
    }

    try {
        //* Check if Article exist
        const exist = await Article.countDocuments({ _id: articleId });
        if (!exist) {
            return { error: "Article doesn't exist.", status: 400 };
        }

        await Article.findByIdAndUpdate(articleId, { $pull: { likes: userId } });
        console.log("Remove userId from article's likes array...");
        return { unlike: 1 };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

module.exports = { createArticle, getFullArticle, generateNewsFeed, getNewsFeed, likeArticle, unlikeArticle };
