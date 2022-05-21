const Article = require('../models/article_model.js');
const Category = require(`${__dirname}/../models/category_model.js`);
const Notification = require(`${__dirname}/../models/notification_model`);
const User = require(`${__dirname}/../models/user_model`);
const Cache = require('../../util/cache');
const { modelResultResponder } = require(`${__dirname}/../../util/util`);

const createArticle = async (req, res) => {
    const author = req.user.userId;
    const { title, category, context, preview, head } = req.body;

    const articleInfo = {
        title,
        category,
        context,
        preview,
        author,
        head,
        createdAt: new Date().toISOString(),
    };

    const values = Object.values(articleInfo);
    if (values.includes('') || values.includes(null) || values.includes(undefined)) {
        res.status(400).json({ error: 'Title, category, context, head and preview are all required.' });
        return;
    }

    const result = await Article.createArticle(articleInfo);

    if (result.data) {
        const article = result.data;

        // TODO: push to newsfeed
        if (Cache.ready) {
            const {
                data: { followee },
            } = await User.getUserInfoFields(author, ['followee']);

            await Article.pushToNewsfeed(article, followee);
        }

        //TODO: Sending Notification and socketIO
        const io = req.app.get('socketio');
        Notification.newPostNotification(article, io);

        result.data = result.data._id.toString();
    }

    modelResultResponder(result, res);
};

const getArticle = async (req, res) => {
    const articleId = req.params.articleId;
    const userId = req.user?.userId;

    const verifyResult = await Article.validAndExist(articleId);

    if (verifyResult.error) {
        modelResultResponder(verifyResult);
        return;
    }

    const result = await Article.getArticle(articleId, userId);

    modelResultResponder(result, res);
};

const getNewsFeed = async (req, res) => {
    const { userId } = req.user;
    let { refresh, lastArticleId } = req.query;
    refresh = refresh && true;

    const result = await Article.getNewsFeed(userId, refresh, lastArticleId);

    modelResultResponder(result, res);
};

const likeArticle = async (req, res) => {
    const { articleId } = req.params;
    const { userId } = req.user;

    const verifyResult = await Article.validAndExist(articleId);
    if (verifyResult.error) {
        modelResultResponder(verifyResult);
        return;
    }

    const result = await Article.likeArticle(userId, articleId);

    if (result.data) {
        const { likeCount, author } = result.data;

        //TODO: Sending Like Article Notification
        const io = req.app.get('socketio');
        await Notification.likeArticleNotification({ articleId, userId, likeCount, author }, io);

        //TODO: Updating article feedback with socketIO
        io.to(articleId).emit('update-like', likeCount);
        result.data = result.data.likeCount;
    }

    modelResultResponder(result, res);
};

const unlikeArticle = async (req, res) => {
    const { articleId } = req.params;
    const { userId } = req.user;

    const verifyResult = await Article.validAndExist(articleId);
    if (verifyResult.error) {
        modelResultResponder(verifyResult);
        return;
    }

    const result = await Article.unlikeArticle(userId, articleId);

    if (result.data !== undefined) {
        //TODO: Updating article feedback with socketIO
        const io = req.app.get('socketio');
        io.to(articleId).emit('update-like', result.data);
    }

    modelResultResponder(result, res);
};

const getCategories = async (_, res) => {
    const result = await Category.getCategories();
    modelResultResponder(result, res);
};

const getLatestArticles = async (req, res) => {
    let userId = req.user?.userId;
    const lastArticleId = req.query.lastArticleId;

    const result = await Article.getLatestArticles(userId, lastArticleId);

    modelResultResponder(result, res);
};

const getCategoryArticles = async (req, res) => {
    const category = req.query.category;

    if (!category) {
        console.log('[ERROR] No category');
        res.status(400).json({ error: 'Please Specify the category of the articles.' });
        return;
    }

    const verifyResult = await Category.validAndExist(category);
    if (verifyResult.error) {
        modelResultResponder(verifyResult);
        return;
    }

    let userId = req.user?.userId;
    let lastArticleId = req.query.lastArticleId;

    const result = await Article.getCategoryArticles({ userId, category, lastArticleId });

    modelResultResponder(result, res);
};

const commentArticle = async (req, res) => {
    const { userId } = req.user;
    const { articleId } = req.params;
    const { comment } = req.body;

    if (!comment) {
        res.status(400).json({ error: 'comment is required.' });
        return;
    }

    const result = await Article.commentArticle({ userId, articleId, comment });

    //TODO: Sending Notification and socketIO
    if (result.data) {
        const { commentId, article } = result.data;

        const io = req.app.get('socketio');
        Notification.commentNotification({ articleId, userId, commentId }, io);

        article.commentEvent = true;
        io.to(articleId).emit('update-comment', JSON.stringify(article));

        result.data = result.data.article;
    }

    modelResultResponder(result, res);
};

const replyComment = async (req, res) => {
    const { userId } = req.user;
    const { articleId } = req.params;
    const { reply, commentId } = req.body;

    if (!reply || !commentId) {
        res.status(400).json({ error: 'Reply and commentId is reqired.' });
        return;
    }

    // const { error, status, data: article } = await Article.replyComment({ userId, articleId, reply, commentId });
    const result = await Article.replyComment({ userId, articleId, reply, commentId });

    if (result.data) {
        // Push notification
        const io = req.app.get('socketio');
        Notification.replyNotification({ articleId, commentId }, io);

        // sending new comments to socket in article room
        io.to(articleId).emit('update-comment', JSON.stringify(result.data));
    }

    modelResultResponder(result, res);
};

const readArticle = async (req, res) => {
    const { articleId } = req.params;

    // const { data: readCount, error, status } = await Article.readArticle(articleId);
    const result = await Article.readArticle(articleId);

    if (result.data) {
        //TODO: Updating article read count with socketIO
        const io = req.app.get('socketio');
        io.to(articleId).emit('update-read', result.data);
    }

    modelResultResponder(result, res);
};

const getHotArticles = async (_, res) => {
    if (!Cache.ready) {
        const result = await Article.generateHotArticles();

        modelResultResponder(result, res);
    } else {
        let hotArticles;

        if (!(await Cache.exists('hot_articles'))) {
            // Generate hot articles and store it in cache
            const { data, error } = await Article.generateHotArticles();

            if (error) {
                res.status(500).error(error);
                return;
            }
            hotArticles = data;

            for (let article of hotArticles) {
                await Cache.rpush('hot_articles', JSON.stringify(article));
            }
        } else {
            // Get hot articles from cache
            hotArticles = await Cache.lrange('hot_articles', 0, -1);
            hotArticles = hotArticles.map((elem) => JSON.parse(elem));
        }

        res.status(200).json({ data: hotArticles });
    }
};

module.exports = {
    createArticle,
    getArticle,
    getNewsFeed,
    likeArticle,
    unlikeArticle,
    getCategories,
    getLatestArticles,
    commentArticle,
    replyComment,
    readArticle,
    getHotArticles,
    getCategoryArticles,
};
