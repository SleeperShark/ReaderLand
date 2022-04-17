require('dotenv').config();
const validator = require('validator');
const User = require('../models/user_model');

const signUp = async (req, res) => {
    let { name } = req.body;
    const { email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400).send({ error: 'Request Error: name, email and password are required.' });
        return;
    }

    if (!validator.isEmail(email)) {
        res.status(400).json({ error: 'Request Error: Invalid email format' });
        return;
    }

    name = validator.escape(name);

    const result = await User.signUp(name, email, password);
    if (result.error) {
        res.status(403).json({ error: result.error.message });
        return;
    }

    const user = result.user;
    if (!user) {
        res.status(500).json({ error: 'Database Query Error' });
        return;
    }

    res.status(200).json({
        data: { user: { id: user._id, name: user.name, email: user.email } },
    });
};

const nativeSignIn = async (email, password) => {
    if (!email || !password) {
        return { error: 'Request Error: email and password are required.', status: 400 };
    }
    try {
        return await User.nativeSignIn(email, password);
    } catch (error) {
        return { error };
    }
};

const signIn = async (req, res) => {
    const data = req.body;
    let result;

    switch (data.provider) {
        case 'native':
            result = await nativeSignIn(data.email, data.password);
            break;
        // case 'facebook':
        //     result = await facebookSignIn(data.access_token);
        //     break;
        default:
            result = { error: 'Wrong Request' };
    }

    if (result.error) {
        const status_code = result.status ? result.status : 403;
        res.status(status_code).json({ error: result.error });
        return;
    }

    const user = result.user;
    if (!user) {
        res.status(500).send({ error: 'Database Query Error' });
        return;
    }

    res.status(200).json({
        data: {
            accessToken: user.accessToken,
            user: {
                id: user._id,
                provider: user.provider,
                name: user.name,
                email: user.email,
                picture: user.picture,
            },
        },
    });
};

const getUserProfile = async (req, res) => {
    const result = await User.getUserDetail(req.user.email);
    if (result.error) {
        res.status(result.status || 500).json({ error: result.error });
        return;
    }

    const profile = result.user;
    res.status(200).json({
        data: {
            name: profile.name,
            email: profile.email,
            provider: profile.provider,
            follower: profile.follower,
            followee: profile.followee,
            favorite_articles: profile.favorite_articles,
            subscribe_category: profile.subscribe_category,
        },
    });
};

const follow = async (req, res) => {
    const { followerId } = req.body;
    const { userId } = req.user;

    if (!followerId) {
        res.status(400).json({ error: 'FollowerId is required.' });
        return;
    }
    const result = await User.follow(userId, followerId);

    if (result.error) {
        res.status(result.status || 500).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: 'OK' });
};

const unfollow = async (req, res) => {
    const { followerId } = req.body;
    const { userId } = req.user;

    if (!followerId) {
        res.status(400).json({ error: 'followerId is required' });
        return;
    }

    const result = await User.unfollow(userId, followerId);

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: 'Ok' });
};

const subscribe = async (req, res) => {
    const { userId } = req.user;
    const { category, weight } = req.body;

    // validate category and weight
    if (!category || !weight) {
        res.status(400).json({ error: 'category and weight is required in subscribe objecr' });
        return;
    } else if (isNaN(parseInt(weight)) || weight <= 0 || weight >= 10) {
        res.status(400).json({ error: 'weight must be a positive integer between 1 and 10.' });
        return;
    }

    const result = await User.subscribe(userId, category, weight);
    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: 'OK' });
};

const unsubscribe = async (req, res) => {
    const { category } = req.body;
    const { userId } = req.user;

    if (!category) {
        res.status(400).json({ error: 'Category is required.' });
        return;
    }

    const result = await User.unsubscribe(userId, category);

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: 'Ok' });
};

const favorite = async (req, res) => {
    const { userId } = req.user;
    const { articleId } = req.body;

    if (!articleId) {
        res.status(400).json({ error: 'articleId is required.' });
        return;
    }

    const result = await User.favorite(userId, articleId);

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    return res.status(200).json({ data: 'Ok' });
};
const unfavorite = async (req, res) => {};

module.exports = {
    getUserProfile,
    signUp,
    signIn,
    follow,
    unfollow,
    subscribe,
    unsubscribe,
    favorite,
    unfavorite,
};
