require('dotenv').config();
const { User, ObjectId } = require('./schemas');
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

const validAndExist = async (userId) => {
    try {
        if (!ObjectId.isValid(userId)) {
            return { error: 'Invalid userId.', status: 400 };
        }

        const exist = await User.findById(ObjectId(userId), { _id: 1 });

        if (!exist) {
            return { error: 'Invalid userId.', status: 400 };
        }

        return { data: userId };
    } catch (error) {
        console.error('[ERROR] validAndExist');
        console.error(error);
        return { error: 'Server Error', status: 500 };
    }
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
            }

            let filter = { email: user.email, _id: ObjectId(req.user.userId) };
            if (roleId != USER_ROLE.ALL) {
                filter.role = roleId;
            }

            const result = await getUserInfoFields(filter, ['_id', 'subscribe', 'follower', 'followee']);

            if (result.error) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            console.log(`User ${user.name} pass authentication...`);

            req.user.userId = result.data._id;
            req.user.preference = { subscribe: result.data.subscribe, follower: result.data.follower };
            req.user.followee = result.data.followee;

            return next();
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Server error' });
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

            const verifyResult = await validAndExist(userId);

            if (verifyResult.error) {
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
            bio: '',
        };

        const user = await User.create(userInfo);

        console.log(`A new user ${name} has registered!`);

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
            return { error: 'Email already registered.', status: 403 };
        }
        console.error('[ERROR] user_model: signUp');
        console.error(error);
        return { error: 'Server Error', status: 500 };
    }
};

const deleteUser = async (userObjectId) => {
    try {
        await User.findByIdAndDelete(userObjectId);
    } catch (error) {
        console.error('[ Error ]: deleteUser');
        console.error(error);
    }
};

const validateEmailToken = async (token) => {
    let user;
    try {
        user = await promisify(jwt.verify)(token, TOKEN_SECRET);
    } catch (error) {
        return { status: 401, error: 'Unauthorized.' };
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
            return { error: 'No matched user.', status: 400 };
        }
    } catch (error) {
        console.error('[ERROR] validateEmailToken');
        console.error(error);
        return { status: 500, error: 'Server Error' };
    }
};

const nativeSignIn = async (email, password, validRequired = true) => {
    try {
        const modelUser = await User.findOne({ email });
        const user = JSON.parse(JSON.stringify(modelUser));

        if (!(await comapreAsync(password, user.password))) {
            return { error: 'Unauthorized.', status: 401 };
        }

        if (!modelUser.valid && validRequired) {
            console.log('Unvalidated Email');
            return { error: 'Unauthorized.', status: 401 };
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

        return {
            data: {
                accessToken,
                user: {
                    id: user._id.toString(),
                    provider: user.provider,
                    name: user.name,
                    email: user.email,
                    picture: user.picture,
                },
            },
        };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

// TODO: get some of user's info
const getUserInfoFields = async (filter, fields) => {
    try {
        const projection = fields.reduce((accu, curr) => {
            accu[curr] = 1;
            return accu;
        }, {});

        const infoFields = await User.findOne(filter, projection);

        if (!infoFields) {
            return { error: 'No matched user', status: 400 };
        }

        return { data: infoFields };
    } catch (error) {
        console.error('[ERROR] getUserInfoFields');
        console.error(error);
        return { error: 'Server Error.', status: 500 };
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
        return { error: 'Server error', status: 500 };
    }
};

const updateUserProfile = async (userId, updateInfo) => {
    try {
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
    try {
        await User.updateOne({ _id: userId }, [
            {
                $set: {
                    follower: {
                        $cond: {
                            if: { $in: [ObjectId(followerId), '$follower'] },
                            then: '$follower',
                            else: { $concatArrays: ['$follower', [ObjectId(followerId)]] },
                        },
                    },
                },
            },
        ]);
        console.log("Successfully update user's follower list...");

        await User.updateOne({ _id: ObjectId(followerId) }, [
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

        return { data: ObjectId(followerId) };
    } catch (error) {
        console.error(error);
        return { error: 'Server Error', status: 500 };
    }
};

const unfollow = async (userId, followerId) => {
    try {
        // remove followerId from user's follower list
        await User.findByIdAndUpdate(userId, { $pull: { follower: ObjectId(followerId) } });
        console.log("Remove followerId from user's follower list...");

        // remove userId from follower's followee list
        await User.findByIdAndUpdate(ObjectId(followerId), { $pull: { followee: userId } });
        console.log("Remove userId from follower's followee list...");

        return { data: followerId };
    } catch (error) {
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
};

const subscribe = async (userId, subscribe) => {
    try {
        const { follower, subscribe: updatedSubscribe } = await User.findByIdAndUpdate(userId, { $set: { subscribe } }, { projection: { subscribe: 1, follower: 1 }, new: true });
        console.log(`Successfully update user's subscription...`);

        if (!follower.length && (!updatedSubscribe || !Object.keys(updatedSubscribe).length)) {
            console.log('No preference, skip the regeneration.');
            return { data: {} };
        }

        return { data: { preference: { follower, subscribe } } };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

// TODO: add articleId to user's favorite array
const favorite = async (userId, articleId) => {
    try {
        // Remove article from favorite if exist
        await User.updateOne({ _id: userId }, { $pull: { favorite: { articleId: ObjectId(articleId) } } });

        // push articleId to favorite array
        await User.updateOne({ _id: userId }, { $push: { favorite: { articleId: ObjectId(articleId), createdAt: new Date().toISOString() } } });

        console.log('Successfully add article to favorite list...');

        return { data: articleId };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

// TODO: remove articleId from user's favorite array
const unfavorite = async (userId, articleId) => {
    try {
        await User.updateOne(
            { _id: userId },
            {
                $pull: {
                    favorite: {
                        articleId: ObjectId(articleId),
                    },
                },
            }
        );

        console.log('Successfully remove article from favorite list...');
        return { data: articleId };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const getAuthorProfile = async (authorId) => {
    if (!ObjectId.isValid(authorId)) {
        console.error('Invalid authorId');
        return { error: 'Invalid authorId', status: 400 };
    }

    try {
        const [authorProfile] = await User.aggregate([
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

        return { data: authorProfile };
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
    deleteUser,
    validateEmailToken,
    getUserInfoFields,
    getUserProfile,
    getAuthorProfile,
    updateUserProfile,
    follow,
    unfollow,
    subscribe,
    favorite,
    unfavorite,
    socketAuthentication,
    validAndExist,
};
