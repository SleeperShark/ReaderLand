const { User, Notification, Article, ObjectId } = require('../server/models/schemas');
const fs = require('fs');
const axios = require('axios');
const API_URL = 'http://localhost:3000/api';

//TODO: process article's author and context field
function processArticles(articles, authors) {
    const name_id = authors.reduce((prev, curr) => {
        prev[curr.name] = curr._id;
        return prev;
    }, {});

    articles.forEach((article) => {
        article.author = name_id[article.author];
        article.head = '0';
        article.context = article.context.split('\n\n').reduce((accu, content, idx, arr) => {
            accu[idx.toString()] = { content, type: 'text' };
            if (idx + 1 != arr.length) {
                accu[idx.toString()].next = (idx + 1).toString();
            }
            return accu;
        }, {});
    });

    return articles;
}

async function getToken(email) {
    const {
        data: {
            data: { accessToken },
        },
    } = await axios.post(`${API_URL}/user/signin`, { email, password: 'password', provider: 'native' });

    return accessToken;
}

async function getFollowed(userId, others) {
    const fans = others[Math.floor(Math.random() * others.length)];

    const fansToken = await getToken(fans.email);

    //Unfollowerd
    await axios({ method: 'DELETE', url: `${API_URL}/user/follow`, data: { followerId: userId }, headers: { Authorization: `Bearer ${fansToken}` } });
    //Follow
    await axios({ method: 'POST', url: `${API_URL}/user/follow`, data: { followerId: userId }, headers: { Authorization: `Bearer ${fansToken}` } });

    console.log(`Event: ${fans._id.toString()} follow user...`);
}

async function followersNewPost(userId, articles, authorsInfo) {
    articles = articles.filter((elem) => elem.author.toString() != userId.toString());
    const { title, category, context, preview, head, author } = articles[Math.floor(Math.random() * articles.length)];

    const [{ email }] = authorsInfo.filter((elem) => elem._id.toString() == author.toString());
    const authorToken = await getToken(email);

    const {
        data: { data: newPostId },
    } = await axios({
        method: 'POST',
        url: `${API_URL}/articles`,
        headers: { Authorization: `Bearer ${authorToken}` },
        data: { title, category, context, preview, head },
    });

    console.log(`Event: newPost ${newPostId}...`);
}

async function readerComment(userArticles, others) {
    //TODO: find a random article
    const article = userArticles[Math.floor(Math.random() * userArticles.length)];

    //TODO: choose random reader
    const reader = others[Math.floor(Math.random() * others.length)];
    const readerToken = await getToken(reader.email);

    await axios({
        method: 'POST',
        url: `${API_URL}/articles/${article._id.toString()}/comment`,
        headers: { Authorization: `Bearer ${readerToken}` },
        data: { comment: `Robot comment...` },
    });

    console.log('Event: reader comment...');
}

async function authorReply(articles, userId, userEmail, others) {
    const articleId = articles[Math.floor(Math.random() * articles.length)];
    //TODO: user leave comment
    const userToken = await getToken(userEmail);
    let {
        data: {
            data: { comments },
        },
    } = await axios({
        method: 'POST',
        url: `${API_URL}/articles/${articleId.toString()}/comment`,
        headers: { Authorization: `Bearer ${userToken}` },
        data: { comment: `User ghost comment...` },
    });

    const commentId = comments[comments.length - 1]._id.toString();

    //TODO: author reply comment
    // get author id
    const { author: authorId } = await Article.findById(articleId, { author: 1 });
    const authorToken = await getToken(others.filter((elem) => elem._id.toString() == authorId.toString())[0].email);
    await axios({
        method: 'POST',
        url: `${API_URL}/articles/${articleId.toString()}/replyComment`,
        headers: { Authorization: `Bearer ${authorToken}` },
        data: { reply: 'Author ghost reply...', commentId },
    });

    console.log('Event: author reply...');
}

async function postGenerator(articles, authorsInfo) {
    const { title, category, context, preview, head, author } = articles[Math.floor(Math.random() * articles.length)];

    const [{ email }] = authorsInfo.filter((elem) => elem._id.toString() == author.toString());
    const authorToken = await getToken(email);

    const {
        data: { data: newPostId },
    } = await axios({
        method: 'POST',
        url: `${API_URL}/articles`,
        headers: { Authorization: `Bearer ${authorToken}` },
        data: { title, category, context, preview, head },
    });

    console.log(`Post Generator ${newPostId}...`);
}

//Target User
async function run() {
    const [{ _id: userId, follower: followedAuthors, email: userEmail }] = await User.aggregate([
        { $match: { name: '魚骨書籤' } },
        {
            $lookup: {
                from: 'User',
                localField: 'follower',
                foreignField: '_id',
                pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
                as: 'follower',
            },
        },
        { $project: { _id: 1, email: 1, follower: 1 } },
    ]);
    let others = await User.find({ _id: { $ne: userId } }, { _id: 1, email: 1 });
    let authors = await User.find({}, { _id: 1, name: 1, email: 1 }).limit(10);

    // Collect articles's id for reply and comment
    const allArticles = await Article.find({}, { _id: 1, author: 1 });
    const userArticles = allArticles.filter((elem) => elem.author.toString() == userId.toString()).map((elem) => elem._id);
    const othersArticles = allArticles.filter((elem) => elem.author.toString() != userId.toString()).map((elem) => elem._id);

    let { articles: articleMaterial } = JSON.parse(fs.readFileSync(`${__dirname}/../test/testCase.json`), 'utf-8');
    articleMaterial = processArticles(articleMaterial, authors);

    //TODO: Notification Generator
    setInterval(async function () {
        switch (Math.floor(Math.random() * 4)) {
            case 0:
                await getFollowed(userId, others);
                break;
            case 1:
                await followersNewPost(userId, articleMaterial, authors);
                break;
            case 2:
                await readerComment(userArticles, others);
                break;
            case 3:
                await authorReply(othersArticles, userId, userEmail, others);
                break;
        }
    }, 1000 * 3);

    //TODO: new Post Generator
    setInterval(async () => {
        await postGenerator(articleMaterial, authors);
    }, 3000);
}

run();
