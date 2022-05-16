const Article = require('../models/article_model.js');
const Notification = require(`${__dirname}/../models/notification_model`);
const Cache = require('../../util/cache');
const { modelResultResponder } = require(`${__dirname}/../../util/util`);

const createArticle = async (req, res) => {
    try {
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

        const { article, error, status } = await Article.createArticle(articleInfo);

        if (error) {
            res.status(status).json({ error });
            return;
        }

        //TODO: Sending Notification and socketIO
        const io = req.app.get('socketio');
        Notification.newPostNotification(article, io);

        res.status(200).json({ data: article._id.toString() });
        return;
    } catch (error) {
        console.error(error);
    }
};

const getArticle = async (req, res) => {
    const articleId = req.params.articleId;
    const userId = req.user?.userId;
    const result = await Article.getArticle(articleId, userId);

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: result.article });
};

const getNewsFeed = async (req, res) => {
    try {
        const { userId } = req.user;
        let { refresh, lastArticleId } = req.query;

        if (refresh) {
            refresh = refresh === 'true';
        } else {
            refresh = false;
        }

        const { data, error, status } = await Article.getNewsFeed(userId, refresh, lastArticleId);

        if (error) {
            res.status(status).json({ error });
        }

        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
        return;
    }
};

const likeArticle = async (req, res) => {
    const { articleId } = req.params;
    const { userId } = req.user;

    const {
        error,
        status,
        data: { likeCount, author },
    } = await Article.likeArticle(userId, articleId);

    if (error) {
        res.status(status).json({ error });
        return;
    }

    const io = req.app.get('socketio');
    //TODO: Sending Like Article Notification
    await Notification.likeArticleNotification({ articleId, userId, likeCount, author }, io);

    //TODO: Updating article feedback with socketIO
    io.to(articleId).emit('update-like', likeCount);

    res.status(200).json({ data: likeCount });
};

const unlikeArticle = async (req, res) => {
    const { articleId } = req.params;
    const { userId } = req.user;

    const { error, status, data: likeCount } = await Article.unlikeArticle(userId, articleId);

    if (error) {
        res.status(status).json({ error });
        return;
    }

    //TODO: Updating article feedback with socketIO
    const io = req.app.get('socketio');
    io.to(articleId).emit('update-like', likeCount);

    res.status(200).json({ data: likeCount });
};

const getCategories = async (_, res) => {
    const result = await Article.getCategories();

    modelResultResponder(result, res);
};

const getLatestArticles = async (req, res) => {
    let userId;
    if (req.user) {
        userId = req.user.userId;
    }
    const lastArticleId = req.query.lastArticleId;

    const { data, error, status } = await Article.getLatestArticles(userId, lastArticleId);

    if (error) {
        res.status(status).json({ error });
        return;
    }

    res.status(200).json({ data });
    return;
};

const getCategoryArticles = async (req, res) => {
    if (!req.query.category) {
        console.log('[ERROR] No category');
        res.status(400).json({ error: 'Please Specify the category of the articles.' });
        return;
    }
    const category = req.query.category;

    let userId;
    if (req.user) {
        userId = req.user.userId;
    }

    let lastArticleId;
    if (req.query.lastArticleId) {
        lastArticleId = req.query.lastArticleId;
    }

    const { data, error, status } = await Article.getCategoryArticles({ userId, category, lastArticleId });
    if (error) {
        res.status(status).json({ error });
        return;
    }

    res.status(200).json({ data });
};

const commentArticle = async (req, res) => {
    const { userId } = req.user;
    const { articleId } = req.params;
    const { comment } = req.body;

    if (!comment) {
        res.status(400).json({ error: 'comment is required.' });
        return;
    }

    const {
        error,
        status,
        data: { article, commentId },
    } = await Article.commentArticle({ userId, articleId, comment });

    if (error) {
        res.status(status).json({ error });
        return;
    }

    //TODO: Sending Notification and socketIO
    const io = req.app.get('socketio');
    Notification.commentNotification({ articleId, userId, commentId }, io);

    // sending new comments to socket in article room
    article.commentEvent = true;
    io.to(articleId).emit('update-comment', JSON.stringify(article));

    return res.status(200).json({ data: article });
};

const replyComment = async (req, res) => {
    const { userId } = req.user;
    const { articleId } = req.params;
    const { reply, commentId } = req.body;

    if (!reply || !commentId) {
        res.status(400).json({ error: 'Reply and commentId is reqired.' });
        return;
    }

    const { error, status, data: article } = await Article.replyComment({ userId, articleId, reply, commentId });

    if (error) {
        res.status(status).json({ error });
    }

    // Push notification
    const io = req.app.get('socketio');
    Notification.replyNotification({ articleId, commentId }, io);

    // sending new comments to socket in article room
    io.to(articleId).emit('update-comment', JSON.stringify(article));

    res.status(200).json({ data: article });
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
