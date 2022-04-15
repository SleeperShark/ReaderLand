const Article = require('../models/article_model.js');
const Cache = require('../../util/cache');

const createArticle = async (req, res) => {
    try {
        const articleInfo = {
            title: req.body.title,
            author: req.user.userId,
            context: req.body.context,
        };

        if (Object.values(articleInfo).includes('') || Object.values(articleInfo).includes(null) || Object.values(articleInfo).includes(undefined)) {
            res.status(400).json({ error: 'Title, author and context are all required.' });
        }

        articleInfo.category = req.body.categories;

        const result = await Article.createArticle(articleInfo);

        if (result.error) {
            const statusCode = result.status ? result.status : 500;
            res.status(statusCode).json({ error: result.error });
            return;
        }

        const article = result.article;
        res.status(200).json({ data: { _id: article._id } });
        return;
    } catch (error) {}
};

const getFullArticle = async (req, res) => {
    const articleId = req.params.articleId;
    const result = await Article.getFullArticle(articleId);

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
            } else if (Array.isArray(result.feeds)) {
                res.status(200).json({ data: result.feeds });
                return;
            }
        }

        const newsfeed = await Article.getNewsFeed(userId);

        res.status(200).json({ data: 'test' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server Error' });
        return;
    }
};

module.exports = { createArticle, getFullArticle, getNewsFeed };
