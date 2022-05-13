const { Article, User, Category, Notification, Draft, ObjectId } = require(`${__dirname}/../server/models/schemas`);
const { generateNewsFeedInCache } = require(`${__dirname}/../server/models/article_model`);
const Cache = require(`${__dirname}/../util/cache`);
const fs = require('fs');
const bcrypt = require('bcrypt');
const { generateHotArticles } = require(`${__dirname}/../util/hotArticleGenerator`);

const categories = [
    '政治與評論',
    '國際時事',
    '電影戲劇',
    '投資理財',
    '職場產業',
    '閱讀書評',
    '創作',
    'ACG',
    '文化生活',
    '旅行美食',
    '音樂藝文',
    '健康與情感',
    '寵物',
    '個人成長',
    '親子與教育',
    '運動',
    '科學',
    '心理',
];

async function insertCategory() {
    await Category.insertMany(
        categories.map((elem) => {
            return {
                category: elem,
            };
        })
    );
}

async function insertAuthor(authors, categories) {
    const users = await User.insertMany(
        authors.map((elem, idx) => {
            const subscribe = categories
                .sort(() => 0.5 - Math.random())
                .slice(0, 15)
                .reduce((prev, cat) => {
                    prev[cat] = Math.floor(Math.random() * 10) + 1;
                    return prev;
                }, {});

            return { ...elem, email: `author_${idx}@ReaderLand.com`, password: bcrypt.hashSync('password', 10), subscribe, valid: true };
        })
    );

    const authorsId = [];
    const followeeList = {};

    for (let user of users) {
        authorsId.push(user._id.toString());
        authors.find((elem) => elem.name == user.name)._id = user._id.toString();

        //TODO: create Notification document
        await Notification.create({
            _id: user._id,
            notifications: [],
        });
    }

    //TODO: assign follower and followee
    authors.forEach((user) => {
        let follower = JSON.parse(JSON.stringify(authorsId));
        // remove user itself
        let idx = follower.indexOf(user._id);
        follower.splice(idx, 1);

        follower = follower.sort(() => 0.5 - Math.random()).slice(0, 3);

        user.follower = follower;
        follower.forEach((id) => {
            followeeList[id] = followeeList[id] || [];
            followeeList[id].push(user._id);
        });
    });

    for (let id in followeeList) {
        authors.find((elem) => elem._id == id).followee = followeeList[id];
    }

    //TODO: update authors follower, followee array into db
    for (let author of authors) {
        const { follower, followee, _id } = author;
        await User.findByIdAndUpdate(_id, { $set: { follower, followee } });
    }

    console.log('Finish assign mutual following between authors...');
    return authorsId;
}

async function insertReader(authorsId, categories) {
    let followeeList = {};

    for (let i = 0; i < 90; i++) {
        const name = `Reader-${i}`;
        const email = `Reader_${i}@ReaderLand.com`;
        const password = bcrypt.hashSync('password', 10);
        const bio = `我只是個普通的讀者，讀者${i}號`;
        const picture = `default-${Math.floor(Math.random() * 9)}.jpg`;
        const subscribe = categories
            .sort(() => 0.5 - Math.random())
            .slice(0, 15)
            .reduce((prev, cat) => {
                prev[cat] = Math.floor(Math.random() * 10) + 1;
                return prev;
            }, {});

        //TODO: insert document and get the reader ID
        const reader = await User.create({ name, email, password, bio, picture, subscribe, valid: true });

        //TODO: create Notification document
        await Notification.create({
            _id: reader._id,
            notifications: [],
        });

        //TODO: assign follower and record followee
        const followers = authorsId.sort(() => 0.5 - Math.random()).slice(0, 4);

        followers.forEach((id) => {
            followeeList[id] = followeeList[id] || [];
            followeeList[id].push(reader._id.toString());
        });

        reader.follower = followers;
        reader.save();

        if (i % 10 == 0) {
            console.log(`Inserting ${i}th readers...`);
        }
    }

    //TODO: insert new followee to authors info
    for (let id in followeeList) {
        await User.updateOne({ _id: id }, { $push: { followee: { $each: followeeList[id] } } });
    }

    console.log('Finish generate readers...');
}

function processArticles(articles) {
    for (let article of articles) {
        article.head = '0';
        article.context = article.context.split('\n\n').reduce((accu, content, idx, arr) => {
            accu[idx.toString()] = { content, type: 'text' };
            if (idx + 1 != arr.length) {
                accu[idx.toString()].next = (idx + 1).toString();
            }
            return accu;
        }, {});
    }
}

async function insertArticle(articles) {
    const authors = await User.aggregate([{ $sort: { _id: 1 } }, { $limit: 10 }, { $project: { _id: 1, name: 1 } }]);
    const authorsId = authors.map((elem) => elem._id.toString());

    const notification = authors.reduce((prev, elem) => {
        prev[elem._id.toString()] = [];
        return prev;
    }, {});

    let usersId = await User.find({}, { _id: 1 });
    usersId = usersId.map((elem) => elem._id.toString());

    const articleOrder = [];
    for (let i = 0; i < articles.length; i++) {
        articleOrder.push(i);
    }

    // setting time interval
    const days = 20;
    const daysInMilli = days * 24 * 60 * 60 * 1000;
    let fakeTimeStamp = new Date().getTime() - daysInMilli;
    const timeInterval = parseInt(daysInMilli / 500);

    const notifications = {};
    // make 500 articles
    for (let round = 1; round < 6; round++) {
        console.log(`Insert Round ${round}...`);

        articleOrder.sort(() => 0.5 - Math.random());

        for (let articleIdx of articleOrder) {
            const tempNotification = {};

            let { author, title, category, preview, context } = articles[articleIdx];
            let authorId = authors.find((elem) => elem.name == author)._id.toString();

            const createdAt = new Date(fakeTimeStamp).toISOString();

            //TODO: Prepare for feedback
            const readCount = Math.floor(Math.random() * 100);
            const likes = usersId.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * readCount));

            const comments = [];
            const praise = ['超級讚', '非常喜歡', '期待下一篇', '敲碗敲碗', '沙發', '精闢的見解', '太驚艷惹', '<3~', '⁽⁽٩(๑˃̶͈̀ ᗨ ˂̶͈́)۶⁾⁾', '(◉３◉)', '(*´∀`)~♥', '｡:.ﾟヽ(*´∀`)ﾉﾟ.:｡'];
            let commentTime = fakeTimeStamp;

            //TODO: create comment
            for (let c = 0; c < Math.floor(Math.random() * likes.length); c++) {
                commentTime += Math.floor(1000 * 60 * 60 * Math.random());
                const reader = usersId[Math.floor(Math.random() * usersId.length)];

                const comment = {
                    context: praise[Math.floor(Math.random() * praise.length)],
                    createdAt: new Date(commentTime).toISOString(),
                    reader,
                };

                // Reply
                if (Math.floor(Math.random() * 10) % 3 == 0) {
                    const replyTime = new Date(commentTime + Math.floor(1000 * 60 * 60 * Math.random())).toISOString();

                    comment.authorReply = {
                        context: '感謝支持',
                        createdAt: replyTime,
                    };
                }

                comments.push(comment);
            }

            //TODO: insert articles
            let article = await Article.create({
                title,
                author: ObjectId(authorId),
                category,
                context,
                createdAt,
                likes,
                readCount,
                comments,
                preview,
                head: '0',
            });

            notifications[authorId] = notifications[authorId] || [];
            //TODO: Collect Notification
            article.comments.forEach((comment) => {
                const { reader, createdAt, _id } = comment;
                const commentNotification = { type: 'comment', createdAt, articleId: article._id, commentId: _id, subject: reader, isread: 'false' };
                notifications[authorId].push(commentNotification);

                if (comment.authorReply) {
                    const replyNotification = {
                        type: 'reply',
                        createdAt: comment.authorReply.createdAt,
                        articleId: article._id,
                        subject: ObjectId(authorId),
                        commentId: _id,
                        isread: 'false',
                    };

                    notifications[reader.toString()] = notifications[reader.toString()] || [];
                    notifications[reader.toString()].push(replyNotification);
                }
            });

            //TODO: timestamp for next article
            fakeTimeStamp += timeInterval;
        }
    }

    console.log("Finish inserting articles,ready to insert user's notification......");

    //TODO: insert Notification
    for (let uid in notifications) {
        console.log(`Inserting User ${uid} notification...`);

        const notificationArr = notifications[uid];
        notificationArr.sort((a, b) => {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        await Notification.updateOne({ _id: ObjectId(uid) }, { $set: { notifications: notificationArr, unread: notificationArr.length } });
    }
}

async function assignFavorite() {
    let usersId = await User.aggregate([{ $sort: { _id: 1 } }, { $limit: 10 }, { $project: { _id: 1 } }]);

    let articles = await Article.find({}, { _id: 1, createdAt: 1 });

    for (let i = 0; i < usersId.length; i++) {
        const favorite = articles
            .sort(() => 0.5 - Math.random())
            .slice(0, 30)
            .map(({ _id, createdAt }) => {
                const timestamp = new Date(createdAt).getTime() + Math.floor(Math.random() * 1000 * 60 * 60 * 24);
                const temp = { articleId: _id, createdAt: new Date(timestamp).toISOString() };
                return temp;
            });

        favorite.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        await User.findByIdAndUpdate(usersId[i]._id, { $set: { favorite } });
    }

    console.log('Finish inserting favorite articles...');
}

async function generateCacheNewsFeed() {
    let usersArr = await User.find({}, { _id: 1, subscribe: 1, follower: 1 }).limit(20);

    for (let { _id, follower, subscribe } of usersArr) {
        console.log(`Regenerate User ${_id}'s newsfeed...`);
        await generateNewsFeedInCache({ userId: _id, preference: { follower, subscribe } });
    }
}

async function initDatabase() {
    //TODO: wait for connection
    console.log('Reset Database...');
    console.log('Waint for connection...');
    await new Promise((r) => {
        setTimeout(() => {
            r();
        }, 1000);
    });

    console.log(new Date().toISOString());

    try {
        await User.deleteMany();
        await Article.deleteMany();
        await Category.deleteMany();
        await Draft.deleteMany();
        await Notification.deleteMany();
        await Cache.flushall();
        console.log('Clear all collections and cache...');

        await insertCategory();
        console.log('Insert categories...');

        const { authors: authorsArr, articles } = JSON.parse(fs.readFileSync(`${__dirname}/testCase.json`), 'utf-8');

        const authorsId = await insertAuthor(authorsArr, categories);

        await insertReader(authorsId, categories);

        processArticles(articles);
        await insertArticle(articles, authorsArr);

        await assignFavorite();

        console.log('Generate Newsfeed in Cache...');
        await generateCacheNewsFeed();

        console.log('generate hot article in cache...');
        await generateHotArticles();

        console.log('Finish Inserting Database...');
    } catch (error) {
        console.log('Error: Setting Database');
        console.error('Error: Setting Database');
        console.error(error);
        console.error();
    }
    console.log();
    process.exit();
}

initDatabase();
