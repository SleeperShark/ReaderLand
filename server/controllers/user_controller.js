require('dotenv').config();
const validator = require('validator');
const User = require('../models/user_model');
const { generateUploadURL } = require('../../util/util');

const getUserInfo = async (req, res) => {
    let { name, email, picture, userId } = req.user;
    picture = `${process.env.IMAGE_URL}/avatar/${picture}`;
    res.status(200).json({ data: { name, email, picture, userId } });
    return;
};

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
    console.log(data);
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
    const { error, status, data } = await User.getUserProfile(req.user.userId);

    if (error) {
        res.status(status).json({ error });
        return;
    }

    return res.status(200).json({ data });
};

const updateUserProfile = async (req, res) => {
    const { userId } = req.user;
    const updateInfo = {};
    for (let field in req.body) {
        updateInfo[field] = req.body[field];
    }

    const { data, error, status } = await User.updateUserProfile(userId, updateInfo);

    if (error) {
        res.status(status).json({ error });
        return;
    }

    res.status(200).json({ data });
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
    console.log(req.body);
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
    const newSubscribe = req.body;

    // validate category and weight
    if (!newSubscribe) {
        res.status(400).json({ error: 'category and weightis required in subscription object' });
        return;
    }
    Object.keys(newSubscribe).forEach((cat) => {
        const weight = parseInt(newSubscribe[cat]);
        if (isNaN(weight) || weight < 1 || weight > 10) {
            res.status(400).json({ error: 'weight value should be between 1 to 10.' });
            return;
        }
    });

    const { data: subscribe, error, status } = await User.subscribe(userId, newSubscribe);

    if (error) {
        res.status(status).json({ error: error });
        return;
    }

    res.status(200).json({ data: subscribe.subscribe });
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

const unfavorite = async (req, res) => {
    const { articleId } = req.body;
    const { userId } = req.user;

    if (!articleId) {
        res.status(400).json({ error: 'ArticleId is required.' });
        return;
    }

    const result = await User.unfavorite(userId, articleId);

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: 'Ok' });
};

const getSubscription = async (req, res) => {
    const { userId } = req.user;
    const result = await User.getSubscription(userId);

    if (result.error) {
        res.status(result.status).json({ error: result.error });
        return;
    }

    res.status(200).json({ data: result.subscribe });

    return;
};

const getAuthorProfile = async (req, res) => {
    const { id: authorId } = req.params;

    const { data, error, status } = await User.getAuthorProfile(authorId);

    if (error) {
        res.status(status).json({ error });
        return;
    }

    res.status(200).json({ data });
};

const getUploadAvatarUrl = async (req, res) => {
    try {
        const { uploadURL, imageName } = await generateUploadURL('avatar/');
        res.status(200).json({ data: { uploadURL, avatarName: imageName, avatarURL: process.env.IMAGE_URL + '/avatar/' + imageName } });
    } catch (error) {
        console.error(error);
        res.status('500').json({ error: 'Server error' });
    }
};

module.exports = {
    getUserProfile,
    getAuthorProfile,
    updateUserProfile,
    signUp,
    signIn,
    follow,
    unfollow,
    subscribe,
    unsubscribe,
    favorite,
    unfavorite,
    getUserInfo,
    getSubscription,
    getUploadAvatarUrl,
};
