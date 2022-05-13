require('dotenv').config();
const { User, ObjectId, Category, Article } = require('./schemas');
const ArticleModel = require(`${__dirname}/article_model`);
const salt = parseInt(process.env.BCRYPT_SALT);
const { TOKEN_SECRET, IMAGE_URL } = process.env;
const bcrypt = require('bcrypt');
const hashAsync = require('util').promisify(bcrypt.hash);
const comapreAsync = require('util').promisify(bcrypt.compare);
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const USER_ROLE = {
    ALL: -1,
    ADMIN: 1,
    USER: 2,
};

const authentication = (roleId, required = true) => {
    return async function (req, res, next) {
        let accessToken = req.get('Authorization');

        if (!accessToken) {
            if (!required) {
                return next();
            }

            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        accessToken = accessToken.replace('Bearer ', '');
        if (accessToken == 'null') {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        try {
            const user = await promisify(jwt.verify)(accessToken, TOKEN_SECRET);
            req.user = user;
            if (roleId == null) {
                next();
            } else {
                let result;
                if (roleId == USER_ROLE.ALL) {
                    result = await getUserDetail(user.email);
                } else {
                    result = await getUserDetail(user.email, roleId);
                }
                if (result.error) {
                    res.status(403).json({ error: 'Forbidden' });
                } else {
                    const userDetail = result.user;
                    console.log(`User ${req.user.name} pass authentication...`);
                    req.user.userId = userDetail._id;
                    req.user.roleId = userDetail.role;
                    next();
                }
            }
            return;
        } catch (error) {
            console.log(error);
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
    };
};

const socketAuthentication = () => {
    return async function (socket, next) {
        try {
            const { token } = socket.handshake.auth;

            console.log('AUTH socket');
            // no required for unregistered user viewing article

            const { userId } = await promisify(jwt.verify)(token, TOKEN_SECRET);

            const exist = await User.countDocuments({ _id: userId });

            if (!exist) {
                next(new Error('Unauthorized'));
            }

            socket.userId = userId;
            next();
        } catch (error) {
            console.error('[ERROR] SocketAuthentication');
            console.error(error);
            next(error);
        }
    };
};

const signUp = async (name, email, password) => {
    try {
        const userInfo = {
            name,
            email,
            role: USER_ROLE.USER,
            password: await hashAsync(password, salt),
            subscribe: {},
            follower: [],
            followee: [],
        };

        await User.create(userInfo);

        console.log(`A new user ${name} has registered!`);
        const { user } = await nativeSignIn(email, password);

        //TODO: Delete unvalidated user in 10 minute
        setTimeout(async () => {
            const user = await User.findOne({ email }, { name: 1, valid: 1, _id: 1 });
            if (!user) {
                console.log(`No match user registered with ${email}`);
                return;
            }

            const { valid, name, _id } = user;

            if (!valid) {
                console.log(`Delete unvalidated user ${name}...`);
                await User.findByIdAndDelete(_id);
            }
        }, 1000 * 60 * 10);

        const emailValidationToken = jwt.sign(
            {
                userId: user._id.toString(),
                provider: user.provider,
                name: user.name,
                timestamp: new Date().toISOString(),
            },
            TOKEN_SECRET
        );

        return { data: { user, emailValidationToken } };
    } catch (error) {
        if (error.message.includes('duplicate')) {
            return { error: 'Email already registered', status: 403 };
        }
        console.error('[ERROR] user_model: signUp');
        console.error(error);
        return { error: 'Server Error', status: 500 };
    }
};

const validateEmailToken = async (token) => {
    let user;
    try {
        user = await promisify(jwt.verify)(token, TOKEN_SECRET);
    } catch (error) {
        return { status: 401, error: 'Token validation failed' };
    }

    const { userId, provider, name, timestamp } = user;

    //Validate Time limit (10 min)
    if (new Date().getTime() - new Date(timestamp).getTime() > 1000 * 60 * 10) {
        return { status: 401, error: 'Token expired.' };
    }

    //Validate user info
    try {
        let validateUser = await User.findOneAndUpdate(
            { _id: ObjectId(userId), provider, name, valid: false },
            { $set: { valid: true } },
            { projection: { name: 1, valid: 1 }, new: true }
        );

        if (validateUser) {
            const { name, valid } = validateUser;
            if (!valid) {
                return { error: 'Server Error', status: 500 };
            }

            return { data: name };
        } else {
            return { error: 'No match user.', status: 400 };
        }
    } catch (error) {
        console.error('[ERROR] validateEmailToken');
        console.error(error);
        return { status: 500, error: 'Server Error' };
    }
};

const nativeSignIn = async (email, password) => {
    try {
        const modelUser = await User.findOne({ email });
        const user = JSON.parse(JSON.stringify(modelUser));

        if (!(await comapreAsync(password, user.password))) {
            return { error: 'Password is wrong' };
        }

        if (!modelUser.valid) {
            return { error: 'Unvalidated email account.', status: 400 };
        }

        const accessToken = jwt.sign(
            {
                provider: user.provider,
                name: user.name,
                email: user.email,
                picture: user.picture,
                userId: user._id.toString(),
            },
            TOKEN_SECRET
        );

        user.accessToken = accessToken;

        return { user };
    } catch (error) {
        console.error(error);
        return { error };
    }
};

const getUserDetail = async (email, roleId) => {
    try {
        if (roleId) {
            return { user: await User.findOne({ email, role: roleId }) };
        } else {
            return { user: await User.findOne({ email }) };
        }
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
};

//TODO: get user profile for personal page
const getUserProfile = async (userId) => {
    try {
        const [profile] = await User.aggregate([
            { $match: { _id: userId } },
            // follower lookup
            {
                $lookup: {
                    from: 'User',
                    localField: 'follower',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                picture: { $concat: [process.env.IMAGE_URL, '/avatar/', '$picture'] },
                                bio: 1,
                            },
                        },
                    ],
                    as: 'follower',
                },
            },
            // followee lookup
            {
                $lookup: {
                    from: 'User',
                    localField: 'followee',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                picture: { $concat: [process.env.IMAGE_URL, '/avatar/', '$picture'] },
                                bio: 1,
                            },
                        },
                    ],
                    as: 'followee',
                },
            },
            // favorite article lookup
            {
                $lookup: {
                    from: 'Article',
                    localField: 'favorite.articleId',
                    let: { favoriteAt: '$favorite.createdAt' },
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                title: 1,
                                author: 1,
                                readCount: 1,
                                category: 1,
                                likeCount: { $size: '$likes' },
                                commentCount: { $size: '$comments' },
                                articleCreatedAt: '$createdAt',
                            },
                        },
                    ],
                    as: 'favorite_article',
                },
            },
            {
                $addFields: {
                    favorite: {
                        $map: {
                            input: '$favorite_article',
                            as: 'f',
                            in: {
                                $mergeObjects: [
                                    {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: '$favorite',
                                                    cond: {
                                                        $eq: ['$$this.articleId', '$$f._id'],
                                                    },
                                                },
                                            },
                                            0,
                                        ],
                                    },
                                    '$$f',
                                ],
                            },
                        },
                    },
                },
            },
            // lookup favorite author info
            {
                $lookup: {
                    from: 'User',
                    localField: 'favorite.author',
                    foreignField: '_id',
                    pipeline: [{ $project: { name: 1, picture: { $concat: [process.env.IMAGE_URL, '/avatar/', '$picture'] } } }],
                    as: 'article_author',
                },
            },
            // user published articles
            {
                $lookup: {
                    from: 'Article',
                    localField: '_id',
                    foreignField: 'author',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                title: 1,
                                readCount: 1,
                                commentCount: { $size: '$comments' },
                                likeCount: { $size: '$likes' },
                                category: 1,
                                createdAt: 1,
                            },
                        },
                        {
                            $sort: {
                                createdAt: -1,
                            },
                        },
                    ],
                    as: 'publishedArticles',
                },
            },
            // final project
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    picture: { $concat: [process.env.IMAGE_URL, '/avatar/', '$picture'] },
                    follower: 1,
                    followee: 1,
                    subscribe: 1,
                    favorite: {
                        articleId: 1,
                        favoritedAt: '$createdAt',
                        title: 1,
                        author: 1,
                        readCount: 1,
                        likeCount: 1,
                        commentCount: 1,
                        articleCreatedAt: 1,
                        category: 1,
                    },
                    article_author: 1,
                    bio: 1,
                    publishedArticles: 1,
                },
            },
        ]);

        // process author into favorite
        const author = {};
        profile.article_author.forEach((authorInfo) => {
            author[authorInfo._id.toString()] = authorInfo;
        });

        profile.favorite.forEach((article) => {
            article.author = author[article.author.toString()];
        });

        delete profile.article_author;

        return { data: profile };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 400 };
    }
};

const updateUserProfile = async (userId, updateInfo) => {
    try {
        // const result = await User.updateOne({ _id: userId }, { $set: updateInfo });
        let user = await User.findByIdAndUpdate(
            userId,
            { $set: updateInfo },
            {
                projection: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    picture: 1,
                    provider: 1,
                },
                new: true,
            }
        );
        console.log('Succeefully update user profile: ' + Object.keys(updateInfo).join(', '));

        user = JSON.parse(JSON.stringify(user));

        for (let key in updateInfo) {
            if (['name', 'email', 'picture'].includes(key)) {
                //Remake JWT for new info
                console.log('Remake JWT...');
                user.accessToken = jwt.sign(
                    {
                        provider: user.provider,
                        name: user.name,
                        email: user.email,
                        picture: user.picture,
                        userId: user._id.toString(),
                    },
                    TOKEN_SECRET
                );
                break;
            }
        }

        user.picture = IMAGE_URL + '/avatar/' + user.picture;

        return { data: user };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const follow = async (userId, followerId) => {
    // check if userId equals to follower
    if (userId.toString() === followerId) {
        console.log("User can't be follower itself");
        return { error: "User can't be follower itself", status: 400 };
    }

    // validate whether followerId match BSON format
    if (!ObjectId.isValid(followerId)) {
        console.error('Invalid followerId.');
        return { error: 'followerId format error', status: 400 };
    }

    followerId = ObjectId(followerId);

    try {
        // check if followe exist
        let exist = await User.countDocuments({ _id: followerId });

        if (!exist) {
            return { error: "FollowerId doesn't exist.", status: 400 };
        }

        await User.updateOne({ _id: userId }, [
            {
                $set: {
                    follower: {
                        $cond: {
                            if: { $in: [followerId, '$follower'] },
                            then: '$follower',
                            else: { $concatArrays: ['$follower', [followerId]] },
                        },
                    },
                },
            },
        ]);
        console.log("Successfully update user's follower list...");

        await User.updateOne({ _id: followerId }, [
            {
                $set: {
                    followee: {
                        $cond: {
                            if: { $in: [userId, '$followee'] },
                            then: '$followee',
                            else: { $concatArrays: ['$followee', [userId]] },
                        },
                    },
                },
            },
        ]);
        console.log("Successfully update follower's followee list...");

        return { follow: 1 };
    } catch (error) {
        console.error(error);
        return { error: 'Server Error', status: 500 };
    }
};

const unfollow = async (userId, followerId) => {
    // check if userId equals to follower
    if (userId.toString() === followerId) {
        return { error: "User can't be follower itself", status: 400 };
    }

    // validate whether followerId follow the BSON format

    if (!ObjectId.isValid(followerId)) {
        console.error('Invalid followerId');
        return { error: 'followerId format error', status: 400 };
    }
    followerId = ObjectId(followerId);

    try {
        // remove followerId from user's follower list
        await User.findByIdAndUpdate(userId, { $pull: { follower: followerId } });
        console.log("Remove followerId from user's follower list...");

        // remove userId from follower's followee list
        await User.findByIdAndUpdate(followerId, { $pull: { followee: userId } });
        console.log("Remove userId from follower's followee list...");
    } catch (error) {
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
    return { unfollow: 1 };
};

const getSubscription = async (userId) => {
    try {
        const result = await User.findById(userId, { subscribe: 1, _id: 0 });

        return { subscribe: result.subscribe };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const subscribe = async (userId, subscribe) => {
    try {
        // verify if category in Cateogry schema
        let categories = await Category.find({}, { _id: 0, category: 1 });
        categories = categories.map((elem) => elem.category);
        const updateSub = {};

        // remove unexist category
        for (cat in subscribe) {
            if (categories.includes(cat)) {
                updateSub[cat] = subscribe[cat];
            }
        }

        const updateResult = await User.findByIdAndUpdate(userId, { $set: { subscribe: updateSub } }, { projection: { subscribe: 1 }, new: true });
        console.log(`Successfully update user's subscription...`);

        console.log('Regenerate newsfeed...');
        if (!Object.keys(updateSub).length) {
            console.log('Empty subscription, skip regeneration newsfeed step...');
            return { data: updateResult };
        }

        const preference = await User.findById(userId, { follower: 1, subscribe: 1 });

        ArticleModel.generateNewsFeedInCache({ userId, preference });

        return { data: updateResult };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

// TODO: add articleId to user's favorite array
const favorite = async (userId, articleId) => {
    //TODO: validate articleId
    if (!ObjectId.isValid(articleId)) {
        console.error('Invalid articleId');
        return { error: 'Invalid articleId', status: 400 };
    }

    articleId = ObjectId(articleId);

    try {
        const exist = await Article.countDocuments({ _id: articleId });
        if (!exist) {
            return { error: "article does't exist.", status: 400 };
        }

        const resultArr = await User.findById({ _id: userId }, { _id: 0, favorite: 1 });
        const newFavorite = { articleId, createdAt: new Date().toISOString() };
        let favorite = resultArr.favorite;

        let updated = false;
        for (let i = 0; i < favorite.length; i++) {
            if (favorite[i].articleId.toString() == articleId.toString()) {
                favorite = [newFavorite, ...favorite.slice(0, i), ...favorite.slice(i + 1, favorite.length)];
                updated = true;
                break;
            }
        }

        if (!updated) {
            favorite = [newFavorite, ...favorite];
        }
        await User.findByIdAndUpdate(userId, { $set: { favorite } });

        console.log('Successfully add article to favorite list...');

        return { favorite: 1 };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

// TODO: remove articleId from user's favorite array
const unfavorite = async (userId, articleId) => {
    // format validation
    if (!ObjectId.isValid(articleId)) {
        console.error('Invalid articleId');
        return { status: 400, error: 'Invalid articleId' };
    }

    articleId = ObjectId(articleId);

    try {
        const exist = await Article.countDocuments({ _id: articleId });
        if (!exist) {
            return { error: "Article does'nt exist.", status: 400 };
        }

        await User.updateOne(
            { _id: userId },
            {
                $pull: {
                    favorite: {
                        articleId,
                    },
                },
            }
        );

        console.log('Successfully remove article from favorite list...');
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }

    return {};
};

const getAuthorProfile = async (authorId) => {
    if (!ObjectId.isValid(authorId)) {
        console.error('Invalid authorId');
        return { error: 'Invalid authorId', status: 400 };
    }
    try {
        const authorProfile = await User.aggregate([
            { $match: { _id: ObjectId(authorId) } },
            { $project: { follower: 1, followee: 1, name: 1, bio: 1, picture: { $concat: [IMAGE_URL, '/avatar/', '$picture'] } } },
            {
                $lookup: {
                    from: 'Article',
                    localField: '_id',
                    foreignField: 'author',
                    pipeline: [
                        { $project: { title: 1, readCount: 1, commentCount: { $size: '$comments' }, likeCount: { $size: '$likes' }, category: 1, createdAt: 1, preview: 1 } },
                        { $sort: { createdAt: -1 } },
                    ],
                    as: 'articles',
                },
            },
        ]);
        return { data: authorProfile[0] };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

module.exports = {
    USER_ROLE,
    authentication,
    nativeSignIn,
    signUp,
    validateEmailToken,
    getUserDetail,
    getUserProfile,
    getAuthorProfile,
    updateUserProfile,
    follow,
    unfollow,
    subscribe,
    favorite,
    unfavorite,
    getSubscription,
    socketAuthentication,
};
