const { Article, User, Category, Draft, Notification } = require('../server/models/schemas');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { use } = require('bcrypt/promises');

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
                .slice(0, 6)
                .reduce((prev, cat) => {
                    prev[cat] = Math.floor(Math.random() * 10) + 1;
                    return prev;
                }, {});

            return { ...elem, email: `author_${idx}@ReaderLand.com`, password: bcrypt.hashSync('password', 10), subscribe };
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

        follower = follower.sort(() => 0.5 - Math.random()).slice(0, 7);

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
            .slice(0, 6)
            .reduce((prev, cat) => {
                prev[cat] = Math.floor(Math.random() * 10) + 1;
                return prev;
            }, {});

        //TODO: insert document and get the reader ID
        const reader = await User.create({ name, email, password, bio, picture, subscribe });

        //TODO: create Notification document
        await Notification.create({
            _id: reader._id,
            notifications: [],
        });

        //TODO: assign follower and record followee
        const followers = authorsId.sort(() => 0.5 - Math.random()).slice(0, 6);

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

    // make 500 articles
    for (let round = 1; round < 6; round++) {
        console.log(`Insert Round ${round}...`);

        articleOrder.sort(() => 0.5 - Math.random());

        for (let articleIdx of articleOrder) {
            let { author, title, category, preview, context } = articles[articleIdx];
            author = authors.find((elem) => elem.name == author)._id.toString();

            const createdAt = new Date(fakeTimeStamp).toISOString();

            //TODO: Prepare for feedback
            const readCount = Math.floor(Math.random() * 100);
            const likes = usersId.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * readCount));

            const comments = [];
            const praise = ['超級讚', '非常喜歡', '期待下一篇', '敲碗敲碗', '沙發', '精闢的見解', '太驚艷惹', '<3~', '⁽⁽٩(๑˃̶͈̀ ᗨ ˂̶͈́)۶⁾⁾', '(◉３◉)', '(*´∀`)~♥', '｡:.ﾟヽ(*´∀`)ﾉﾟ.:｡'];
            let commentTime = fakeTimeStamp;

            for (let c = 0; c < Math.floor(Math.random() * likes.length); c++) {
                commentTime += Math.floor(1000 * 60 * 60 * Math.random());

                const comment = {
                    context: praise[Math.floor(Math.random() * praise.length)],
                    createdAt: new Date(commentTime),
                    reader: usersId[Math.floor(Math.random() * usersId.length)],
                };

                // Reply
                if (Math.floor(Math.random() * 10) % 3 == 0) {
                    comment.authorReply = {
                        context: '感謝支持',
                        createdAt: new Date(commentTime + Math.floor(1000 * 60 * 60 * Math.random())),
                    };
                }

                comments.push(comment);
            }

            //TODO: insert articles
            await Article.create({
                title,
                author,
                category,
                context,
                createdAt,
                likes,
                readCount,
                comments,
                preview,
                head: '0',
            });

            fakeTimeStamp += timeInterval;
        }
    }

    console.log('Finish inserting articles...');
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

async function initDatabase() {
    try {
        await User.deleteMany();
        await Article.deleteMany();
        await Category.deleteMany();
        await Draft.deleteMany();
        console.log('Clear all collections...');

        await insertCategory();
        console.log('Insert categories...');

        const { authors: authorsArr, articles } = JSON.parse(fs.readFileSync('./test/testCase.json'), 'utf-8');

        const authorsId = await insertAuthor(authorsArr, categories);

        await insertReader(authorsId, categories);

        processArticles(articles);
        await insertArticle(articles, authorsArr);

        await assignFavorite();
    } catch (error) {
        console.error(error);
    }
}

initDatabase();
