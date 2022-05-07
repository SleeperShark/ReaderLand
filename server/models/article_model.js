require('dotenv').config();
const { IMAGE_URL } = process.env;
const { Article, ObjectId, User, Category } = require('./schemas');
const Notification = require('./notification_model');
const { articleWeightCounter } = require(`${__dirname}/../../util/util`);
const Cache = require('../../util/cache');

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
        console.log(`User ${articleInfo.author.toString()} successfully create article: ${article._id}`);

        // TODO: Insert the new article to followee's newsfeed Queue
        if (Cache.ready) {
            pushToNewsfeed(article);
        }

        return { article };
    } catch (error) {
        console.log(error);
        let status = 500;
        let msg = 'Server Error';
        if (error.message.includes('duplicate')) {
            status = 400;
            msg = "You can't have two articles with same title";
        }

        return { error: msg, status };
    }
};

const getArticle = async (articleId, userId = '') => {
    if (!ObjectId.isValid(articleId)) {
        console.error('Invalid articleId.');
        return { error: 'Invalid articleId.', status: 400 };
    }

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
                                picture: 1,
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

        if (!article) {
            return { error: 'No matched article.', status: 400 };
        }

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

            //TODO: check favorited
            const { favorite } = await User.findById(userId, { _id: 0, favorite: 1 });
            for (let favoretedArticle of favorite) {
                if (favoretedArticle.articleId.toString() == articleId.toString()) {
                    article.favorited = true;
                    break;
                }
            }
        }

        //TODO: image url
        article.author.picture = `${IMAGE_URL}/avatar/${article.author.picture}`;

        mergeCommentsReaderInfo(article);

        return { article };
    } catch (error) {
        console.log(error);
        return { error: error.message, status: 500 };
    }
};

const generateNewsFeed = async (userId, lastArticleId) => {
    try {
        // acquire user's follower and subscribe categories
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
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    picture: 1,
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

        // Caclulate weight for each article in newsfeedMaterial
        newsfeedMaterial.forEach((article, idx, arr) => {
            arr[idx]['weight'] = articleWeightCounter(article, userPreference);
        });

        if (Cache.ready) {
            console.log('Saving Newsfeed into cache...');
            const cacheFeed = [];
            // const record = [];
            for (let i = 0; i < newsfeedMaterial.length; i += 50) {
                const temp = newsfeedMaterial.slice(i, 50 + i);
                temp.sort((a, b) => b.weight - a.weight);

                // record.push(...temp);
                cacheFeed.push(...temp.map((elem) => elem._id));
            }

            await Cache.del(`${userId}_newsfeed`);
            await Cache.rpush(`${userId}_newsfeed`, ...cacheFeed);
            // fs.writeFileSync('NewsFeed.json', JSON.stringify(record));
            await Cache.set(`${userId}_timestamp`, new Date().toISOString());

            console.log("Update User's newsfeed successfully");

            return { cache: 1 };
        } else {
            console.log('Cache failed, return top 100 articles according to weight');
            newsfeedMaterial.sort((a, b) => b.weight - a.weight);
            feeds = newsfeedMaterial.slice(0, 100).map((article) => {
                article.author.picture = `${process.env.IMAGE_URL}/avatar/${article.author.picture}`;
                return article;
            });
            // console.log(feeds[0]);
            return { feeds };
        }
    } catch (error) {
        console.log(error);
        return { error: error.message };
    }

    // fs.writeFileSync('weightRecord.json', JSON.stringify(weightRecord));
};

// TODO: process articles (image url, favorited, liked, commentd)
async function processArticles(articles, userId) {
    let favorites;
    let uidString;
    let followers;

    if (userId) {
        uidString = userId.toString();
        // Get favorited articles list
        let result = await User.findById(userId, { _id: 0, favorite: { articleId: 1 }, follower: 1 });
        favorites = result.favorite.map((elem) => elem.articleId.toString());
        followers = result.follower.map((elem) => elem.toString());
    }

    articles.forEach((article) => {
        // image url
        article.author.picture = `${IMAGE_URL}/avatar/${article.author.picture}`;

        if (userId) {
            // liked
            for (let likeUser of article.likes) {
                if (likeUser.toString() == uidString) {
                    article.liked = true;
                    break;
                }
            }

            // commented
            for (let comment of article.comments) {
                if (comment.reader.toString() == uidString) {
                    article.commented = true;
                    break;
                }
            }

            //favorited
            if (favorites.includes(article._id.toString())) {
                article.favorited = true;
            }

            //followed
            if (followers.includes(article.author._id.toString())) {
                article.author.followed = true;
            }
            // console.log(article);
        }

        article.likeCount = article.likes.length;
        delete article.likes;

        article.commentCount = article.comments.length;
        delete article.comments;
    });
}

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
                    pipeline: [{ $project: { _id: 1, name: 1, picture: 1, bio: 1 } }],
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

        await processArticles(feeds, userId);

        // organize article in newsfeed order
        const temp = {};
        feeds.forEach((article) => {
            temp[article._id.toString()] = article;
        });
        feeds = feedsId.map((elem) => temp[elem.toString()]);

        return feeds;
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const getLatestArticles = async (token) => {
    try {
        let articles = await Article.aggregate([
            { $sort: { _id: -1 } },
            { $limit: 100 },
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

        // * organize article data
        await processArticles(articles);

        return { latestArticles: articles };
    } catch (error) {
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

// TODO: push userId to Article.likes array
const likeArticle = async (userId, articleId) => {
    //* examine the articleId format
    if (!ObjectId.isValid(articleId)) {
        console.error('Invalid articleId.');
        return { error: 'ArticleId format error', status: 400 };
    }

    articleId = ObjectId(articleId);

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

        const [{ likeCount }] = await Article.aggregate([{ $match: { _id: ObjectId(articleId) } }, { $project: { likeCount: { $size: '$likes' } } }]);

        return { data: likeCount };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const unlikeArticle = async (userId, articleId) => {
    //* examine the articleId format
    if (!ObjectId.isValid(articleId)) {
        console.error('Invalid articleId.');
        return { error: 'ArticleId format error', status: 400 };
    }

    articleId = ObjectId(articleId);

    try {
        //* Check if Article exist
        const exist = await Article.countDocuments({ _id: articleId });
        if (!exist) {
            return { error: "Article doesn't exist.", status: 400 };
        }

        const { likes } = await Article.findByIdAndUpdate(
            articleId,
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

const getCategories = async () => {
    try {
        let categories = await Category.find({}, { _id: 0, category: 1 });
        categories = categories.map((elem) => elem.category);
        return { categories };
    } catch (error) {
        console.error(error);
        return { status: 500, error: error.message };
    }
};

//TODO: Fetch latest feedback after article is commented or replied
async function getUpdatedComment(articleId) {
    const [article] = await Article.aggregate([
        { $match: { _id: articleId } },
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
                _id: 0,
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
        // validate articleId
        if (!ObjectId.isValid(articleId)) {
            console.error('Invalid articleId.');
            return { error: 'ArticleId format error', status: 400 };
        }

        articleId = ObjectId(articleId);

        // update comment
        await Article.updateOne(
            { _id: articleId },
            {
                $push: {
                    comments: {
                        context: comment,
                        reader: userId,
                        createdAt: new Date().toISOString(),
                    },
                },
            }
        );

        console.log('Sucessfully update comment, ready to return latest comment and likes to user...');

        const updatedComment = await getUpdatedComment(articleId);

        return { data: updatedComment };
    } catch (error) {
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const replyComment = async ({ userId, articleId, reply, commentId }) => {
    //* verify articleId
    try {
        articleId = ObjectId(articleId);
        commentId = ObjectId(commentId);
    } catch (error) {
        console.error('Invalid articleId or commentId');
        return { status: 400, error: 'Invalid articleId' };
    }

    try {
        const exist = await Article.countDocuments({ _id: articleId, author: userId, 'comments._id': commentId });

        if (!exist) {
            console.error('Unmatched articleId, authorId or commentId');
            return { status: 400, error: 'Unmatched articleId or authorId' };
        }

        await Article.updateOne(
            { _id: articleId, author: userId, 'comments._id': commentId },
            {
                $set: { 'comments.$.authorReply': { context: reply, createdAt: new Date().toISOString() } },
            }
        );

        console.log('Successfully update reply content, ready to return updated comment...');

        const updatedComment = await getUpdatedComment(articleId);

        return { data: updatedComment };
    } catch (error) {
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const readArticle = async (articleId) => {
    if (!ObjectId.isValid(articleId)) {
        console.error('Invalid articleId.');
        return { error: 'Invalid articleId.', status: 400 };
    }

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
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

module.exports = {
    createArticle,
    getArticle,
    generateNewsFeed,
    getNewsFeed,
    likeArticle,
    unlikeArticle,
    getCategories,
    getLatestArticles,
    commentArticle,
    replyComment,
    readArticle,
};
