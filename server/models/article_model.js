require('dotenv').config({ path: __dirname + '/../../.env' });
const { IMAGE_URL } = process.env;
const { Article, ObjectId, User } = require('./schemas');
const { articleWeightCounter } = require(`${__dirname}/../../util/util`);
const Cache = require('../../util/cache');

const validAndExist = async (articleId) => {
    try {
        if (!ObjectId.isValid(articleId)) {
            return { error: 'Invalid articleId', status: 400 };
        }

        const exist = await Article.findById(ObjectId(articleId), { _id: 1 });
        if (!exist) {
            return { error: 'Invalid articleId', status: 400 };
        }

        return { data: true };
    } catch (error) {
        console.error('[ERROR] validAndExist');
        console.error(error);
        return { error: 'Server Error', status: 500 };
    }
};

//get userid: { _id, picture, name } object
function mergeCommentsReaderInfo(article) {
    // TODO: process userinfo in comment array

    const readersInfo = {};

    for (let user of article.comments_reader) {
        readersInfo[user._id.toString()] = { ...user };
    }

    delete article.comments_reader;

    article.comments.forEach((comment) => {
        comment.reader = readersInfo[comment.reader.toString()];
    });

    return;
}

const pushToNewsfeed = async (article, followee) => {
    try {
        const followeeNum = followee.length;
        //TODO: make followee list match lua format
        followee = followee.map((elem) => elem.toString() + '_newsfeed');
        const articleId = article._id.toString();

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
        const article = await Article.create(articleInfo);
        console.log(`User ${articleInfo.author.toString()} successfully create article: ${article._id}`);

        return { data: article };
    } catch (error) {
        console.error('[ERROR] article_model.createArticle');
        console.error(error);

        if (error.message.includes('duplicate')) {
            return { error: 'Duplicate index on article title.', status: 400 };
        }

        return { error: 'Server Error.', status: 500 };
    }
};

const getArticle = async (articleId, userId = '') => {
    try {
        const [article] = await Article.aggregate([
            { $match: { _id: new ObjectId(articleId) } },
            {
                $lookup: {
                    from: 'User',
                    localField: 'author',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                picture: { $concat: [IMAGE_URL, '/avatar/', '$picture'] },
                                followed: {
                                    $cond: {
                                        if: { $in: [userId, '$followee'] },
                                        then: true,
                                        else: false,
                                    },
                                },
                            },
                        },
                    ],
                    as: 'author',
                },
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'comments.reader',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                picture: { $concat: [IMAGE_URL, '/avatar/', '$picture'] },
                            },
                        },
                    ],
                    as: 'comments_reader',
                },
            },
            {
                $project: {
                    _id: 0,
                    author: { $arrayElemAt: ['$author', 0] },
                    title: 1,
                    context: 1,
                    createdAt: 1,
                    readCount: 1,
                    likes: 1,
                    category: 1,
                    comments: 1,
                    comments_reader: 1,
                    head: 1,
                },
            },
        ]);

        if (userId) {
            //TODO: check liked
            const uidString = userId.toString();
            for (let likeId of article.likes) {
                if (likeId.toString() == uidString) {
                    article.liked = true;
                    break;
                }
            }

            //TODO: check commented
            for (let { reader } of article.comments) {
                if (reader._id.toString() == uidString) {
                    article.commented = true;
                    break;
                }
            }
        }

        mergeCommentsReaderInfo(article);

        return { data: article };
    } catch (error) {
        console.error('[ERROR] article_model.getArticle');
        console.error(error);
        return { error: 'Server Error.', status: 500 };
    }
};

const generateNewsFeedInCache = async ({ userId, lastArticleId, preference }, cache = true) => {
    let { follower, subscribe } = preference;
    let limit = cache ? 200 : 25;

    let aggregateArr = [];
    if (lastArticleId) {
        aggregateArr.push({ $match: { _id: { $lt: ObjectId(lastArticleId) } } });
    }

    if (!subscribe) {
        subscribe = {};
    }

    aggregateArr.push(
        {
            $sort: { _id: -1 },
        },
        {
            $match: { $or: [{ author: { $in: follower } }, { category: { $in: Object.keys(subscribe) } }] },
        },
        {
            $limit: limit,
        },
        {
            $project: {
                _id: 1,
                author: 1,
                createdAt: 1,
                readCount: 1,
                likeCount: { $size: '$likes' },
                commentCount: { $size: '$comments' },
                category: 1,
            },
        }
    );

    let newsfeedMaterial = await Article.aggregate(aggregateArr);
    const searchingTimestamp = new Date().toISOString();

    // check if newsfeed empty
    if (!newsfeedMaterial.length) {
        console.log('No more feed to search.');
        return { data: false };
    }

    newsfeedMaterial = JSON.parse(JSON.stringify(newsfeedMaterial));
    console.log(`Newsfeed Material length: ${newsfeedMaterial.length}`);

    // Caclulate weight for each article in newsfeedMaterial
    newsfeedMaterial.forEach((article, idx, arr) => {
        arr[idx]['weight'] = articleWeightCounter(article, preference);
    });

    if (!cache) {
        return { data: newsfeedMaterial };
    }

    const cacheFeed = [];
    for (let i = 0; i < newsfeedMaterial.length; i += 50) {
        const temp = newsfeedMaterial.slice(i, 50 + i);
        temp.sort((a, b) => b.weight - a.weight);

        cacheFeed.push(...temp.map((elem) => elem._id.toString()));
    }

    console.log('Saving Newsfeed into cache...');

    // First generated
    if (!(await Cache.exists(`${userId}_timestamp`))) {
        console.log('Adding timestamp for feed');
        await Cache.set(`${userId}_timestamp`, searchingTimestamp);
    }

    console.log('Adding tail for feeds...');
    await Cache.set(`${userId}_newsfeed_tail`, newsfeedMaterial[newsfeedMaterial.length - 1]._id.toString());

    await Cache.rpush(`${userId}_newsfeed`, ...cacheFeed);
    console.log("Update User's newsfeed successfully");

    return { data: true };
};

const getFeedsFromId = async (idArr, userId) => {
    if (typeof idArr[0] == 'string') {
        idArr = idArr.map((elem) => ObjectId(elem));
    }

    let feedArticles = await Article.aggregate([
        {
            $match: { _id: { $in: idArr } },
        },
        {
            $lookup: {
                from: 'User',
                localField: 'author',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            picture: { $concat: [IMAGE_URL, '/avatar/', '$picture'] },
                            followed: {
                                $cond: {
                                    if: { $in: [userId, '$followee'] },
                                    then: true,
                                    else: false,
                                },
                            },
                            bio: 1,
                        },
                    },
                ],
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

    feedArticles = JSON.parse(JSON.stringify(feedArticles));

    feedArticles.forEach((article) => {
        if (userId) {
            // check liked
            for (let uid of article.likes) {
                if (uid.toString() == userId.toString()) {
                    article.liked = true;
                    break;
                }
            }
            // check commentd
            for (let comment of article.comments) {
                if (comment.reader.toString() == userId.toString()) {
                    article.commented = true;
                    break;
                }
            }
        }

        article.likeCount = article.likes.length;
        delete article.likes;
        article.commentCount = article.comments.length;
        delete article.comments;
    });
    return feedArticles;
};

// TODO: get articles preview from customized newsfeed
const getNewsFeed = async (userId, refresh, lastArticleId, preference) => {
    try {
        if (!preference.follower.length && (!preference.subscribe || !Object.keys(preference.subscribe).length)) {
            return { data: { noPreference: true } };
        }

        let EndOfFeed = false;
        let feedsId;

        let lastId = refresh ? undefined : lastArticleId;

        if (!Cache.ready) {
            //TODO: Cache fail condition
            let { data: feedsWeight } = await generateNewsFeedInCache({ userId, preference, lastArticleId: lastId }, false);

            const feedsId = feedsWeight.map((elem) => elem._id);

            //TODO: get Last articleId
            const lastArticleId =
                feedsWeight
                    .reduce(
                        (accu, elem) => {
                            if (new Date(elem.createdAt).getTime() < new Date(accu.createdAt).getTime()) {
                                return elem;
                            } else {
                                return accu;
                            }
                        },
                        { createdAt: new Date() }
                    )
                    ._id.toString() || undefined;

            const id_weight = feedsWeight.reduce((accu, curr) => {
                accu[curr._id.toString()] = curr.weight;
                return accu;
            }, {});

            let userFeeds = await getFeedsFromId(feedsId, userId);

            userFeeds.sort((a, b) => id_weight[b._id.toString()] - id_weight[a._id.toString()]);

            return { data: { userFeeds, EndOfFeed: feedsId.length < 25, cacheFail: true, lastArticleId } };
        } else {
            //TODO: get feeds id from cache
            if (refresh) {
                await Cache.del(`${userId}_newsfeed_tail`);
                await Cache.del(`${userId}_timestamp`);
                await Cache.del(`${userId}_newsfeed`);
            }

            if (!(await Cache.exists(`${userId}_timestamp`))) {
                // Check if user's newsfeed exist
                let { data } = await generateNewsFeedInCache({ userId, preference });
                if (!data) {
                    // No preference article
                    return { data: { EndOfFeed: true } };
                }
            }

            //* get 25 feeds back from cache
            const luaScript = `
            local feeds = redis.call('lrange', KEYS[1], 0, 24);
            redis.call('ltrim', KEYS[1], 25, -1);
    
            local left = redis.call('lrange', KEYS[1], 0, -1);
            return {feeds, #left};
            `;
            let [idArr, left] = await Cache.eval(luaScript, 1, `${userId}_newsfeed`);

            if (left == 0) {
                let lastArticleId = await Cache.get(`${userId}_newsfeed_tail`);
                let { data } = await generateNewsFeedInCache({ userId, lastArticleId, preference });

                if (!data) {
                    EndOfFeed = true;
                    await Cache.del(`${userId}_newsfeed_tail`);
                    await Cache.del(`${userId}_timestamp`);
                }
            }
            feedsId = idArr;
        }

        const idOrder = feedsId.reduce((accu, elem, idx) => {
            accu[elem] = idx;
            return accu;
        }, {});

        // TODO: get articles preview from articleId
        let userFeeds = await getFeedsFromId(feedsId, userId);

        userFeeds.sort((a, b) => idOrder[a._id.toString()] - idOrder[b._id.toString()]);

        return { data: { userFeeds, EndOfFeed } };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const getLatestArticles = async (userId, lastArticleId) => {
    try {
        let aggregateArr = [];

        if (lastArticleId) {
            aggregateArr.push({ $match: { _id: { $lt: ObjectId(lastArticleId) } } });
        }

        aggregateArr.push(
            { $sort: { _id: -1 } },
            { $limit: 25 },
            {
                $project: {
                    _id: 1,
                },
            }
        );

        let articlesIdArr = await Article.aggregate(aggregateArr);

        articlesIdArr = articlesIdArr.map((elem) => elem._id);

        let latest = await getFeedsFromId(articlesIdArr, userId);

        latest.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        let EndOfFeed = latest.length < 25;

        return { data: { latest, EndOfFeed } };
    } catch (error) {
        console.error('[ERROR]: getLatestArticles');
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const getCategoryArticles = async ({ userId, category, lastArticleId }) => {
    try {
        //TODO: NO Cache scenario
        let aggregateArr = [];

        if (lastArticleId) {
            aggregateArr.push({ $match: { _id: { $lt: ObjectId(lastArticleId) } } });
        }

        aggregateArr.push(
            {
                $match: { category: { $in: [category] } },
            },
            { $sort: { _id: -1 } },
            { $limit: 25 },
            {
                $project: {
                    _id: 1,
                },
            }
        );

        let articlesIdArr = await Article.aggregate(aggregateArr);
        articlesIdArr = articlesIdArr.map((elem) => elem._id);

        let categoryArticles = await getFeedsFromId(articlesIdArr, userId);

        categoryArticles.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        let EndOfFeed = categoryArticles.length < 25;

        return { data: { categoryArticles, EndOfFeed } };
    } catch (error) {
        console.error('ERROR: getLatestArticles');
        console.error(error);
        return { error: 'Server Error', status: 500 };
    }
};

// TODO: push userId to Article.likes array
const likeArticle = async (userId, articleId) => {
    try {
        await Article.updateOne({ _id: ObjectId(articleId) }, [
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

        const [{ likeCount, author }] = await Article.aggregate([{ $match: { _id: ObjectId(articleId) } }, { $project: { author: 1, likeCount: { $size: '$likes' } } }]);

        return { data: { likeCount, author } };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const unlikeArticle = async (userId, articleId) => {
    try {
        const { likes } = await Article.findByIdAndUpdate(
            ObjectId(articleId),
            { $pull: { likes: userId } },
            {
                $project: { likes: 1 },
                new: true,
            }
        );

        console.log("Remove userId from article's likes array...");

        return { data: likes.length };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

//TODO: Fetch latest feedback after article is commented or replied
async function getUpdatedComment(articleId) {
    const [article] = await Article.aggregate([
        { $match: { _id: ObjectId(articleId) } },
        {
            $lookup: {
                from: 'User',
                localField: 'author',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            picture: { $concat: [`${IMAGE_URL}/avatar/`, '$picture'] },
                        },
                    },
                ],
                as: 'author',
            },
        },
        {
            $lookup: {
                from: 'User',
                localField: 'comments.reader',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            picture: { $concat: [`${IMAGE_URL}/avatar/`, '$picture'] },
                        },
                    },
                ],
                as: 'comments_reader',
            },
        },
        {
            $project: {
                author: { $arrayElemAt: ['$author', 0] },
                comments: 1,
                comments_reader: 1,
            },
        },
    ]);

    mergeCommentsReaderInfo(article);
    return article;
}

const commentArticle = async ({ userId, articleId, comment }) => {
    try {
        const commentElem = { context: comment, reader: userId, createdAt: new Date().toISOString() };

        // update comment
        const { matchedCount } = await Article.updateOne(
            { _id: ObjectId(articleId) },
            {
                $push: {
                    comments: commentElem,
                },
            }
        );

        if (!matchedCount) {
            return { error: 'No matched article.', status: 400 };
        }

        console.log('Sucessfully update comment, ready to return latest comment and likes to user...');

        const updatedArticle = await getUpdatedComment(articleId);
        const updatedCommentId = updatedArticle.comments[updatedArticle.comments.length - 1]._id.toString();

        return { data: { article: updatedArticle, commentId: updatedCommentId } };
    } catch (error) {
        console.error('[ERROR] commentArticle');
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const replyComment = async ({ userId, articleId, reply, commentId }) => {
    try {
        const { matchedCount } = await Article.updateOne(
            { _id: ObjectId(articleId), author: userId, 'comments._id': ObjectId(commentId) },
            {
                $set: { 'comments.$.authorReply': { context: reply, createdAt: new Date().toISOString() } },
            }
        );

        if (!matchedCount) {
            console.error('No matched article or comment.');
            return { error: 'No matched article or comment.', status: 400 };
        }

        console.log('Successfully update reply content, ready to return updated comment...');

        const updatedComment = await getUpdatedComment(ObjectId(articleId));

        return { data: updatedComment };
    } catch (error) {
        console.error('[ERROR] replyComment');
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const readArticle = async (articleId) => {
    try {
        const { readCount } = await Article.findByIdAndUpdate(
            ObjectId(articleId),
            {
                $inc: { readCount: 1 },
            },
            { new: true, projection: { readCount: 1 } }
        );

        return { data: readCount };
    } catch (error) {
        console.log('[ERROR] readArticle');
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const generateHotArticles = async () => {
    try {
        const { READ_WEIGHT, READ_DIVISION, LIKE_WEIGHT, LIKE_DIVISION, COMMENT_WEIGHT, COMMENT_DIVISION } = process.env;

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

        hotArticles.forEach((elem) => {
            elem._id = elem._id.toString();
            elem.author._id = elem.author._id.toString();
        });

        return { data: hotArticles };
    } catch (error) {
        console.error('[ERROR] generateHotArticles');
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

module.exports = {
    validAndExist,
    createArticle,
    getArticle,
    getNewsFeed,
    likeArticle,
    unlikeArticle,
    getLatestArticles,
    commentArticle,
    replyComment,
    readArticle,
    generateHotArticles,
    getCategoryArticles,
    generateNewsFeedInCache,
    pushToNewsfeed,
};
