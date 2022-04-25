const Article = require('../models/article_model.js');
const Cache = require('../../util/cache');

const createArticle = async (req, res) => {
    try {
        const author = req.user.userId;
        const { title, category, context, preview } = req.body;

        const articleInfo = {
            title,
            category,
            context,
            preview,
            author,
        };

        const values = Object.values(articleInfo);
        if (values.includes('') || values.includes(null) || values.includes(undefined)) {
            res.status(400).json({ error: 'Title, category, context and preview are all required.' });
            return;
        }

        const result = await Article.createArticle(articleInfo);

        if (result.error) {
            const statusCode = result.status ? result.status : 500;
            res.status(statusCode).json({ error: result.error });
            return;
        }

        const { article } = result;
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
        const userId = req.user.userId;
        let cacheKey = `${userId}_newsfeed`;

        // TODO: Check if newsfeed cache exist
        if (!Cache.ready || (await Cache.exists(cacheKey)) === 0) {
            // no feeds in cache
            const result = await Article.generateNewsFeed(userId);

            if (result.error) {
                res.status(500).json({ error: 'Server Error' });
                return;
            } else if (result.feeds) {
                res.status(200).json({ data: result.feeds });
                return;
            }
        }

        const newsfeed = await Article.getNewsFeed(userId);

        res.status(200).json({ data: newsfeed });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server Error' });
        return;
    }
};

const likeArticle = async (req, res) => {
    const { articleId } = req.params;
    const { userId } = req.user;

    const result = await Article.likeArticle(userId, articleId);

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: result.data });
};

const unlikeArticle = async (req, res) => {
    const { articleId } = req.params;
    const { userId } = req.user;

    const result = await Article.unlikeArticle(userId, articleId);

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: result.data });
};

const getCategories = async (req, res) => {
    const result = await Article.getCategories();

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: result.categories });
};

const getLatestArticles = async (req, res) => {
    const accessToken = req.get('Authorization');
    const result = await Article.getLatestArticles(accessToken);

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: result.latestArticles });
    return;
};

const commentArticle = async (req, res) => {
    const { userId } = req.user;
    const { articleId } = req.params;
    const { comment } = req.body;

    if (!articleId || !comment) {
        res.status(400).json({ error: 'articleId and context are both required.' });
        return;
    }

    const { error, status, data } = await Article.commentArticle({ userId, articleId, comment });

    if (error) {
        res.status(status).json({ error });
        return;
    }

    return res.status(200).json({ data });
};

const replyComment = async (req, res) => {
    const { userId } = req.user;
    const { articleId } = req.params;
    const { reply, commentId } = req.body;

    if (!reply || !commentId) {
        res.status(400).json({ error: 'Reply and commentId is reqired.' });
        return;
    }

    const { error, status, data } = await Article.replyComment({ userId, articleId, reply, commentId });

    if (error) {
        res.status(status).json({ error });
    }

    res.status(200).json({ data });
};

module.exports = { createArticle, getArticle, getNewsFeed, likeArticle, unlikeArticle, getCategories, getLatestArticles, commentArticle, replyComment };
