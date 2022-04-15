const { User, Article } = require('../server/models/schemas');

async function run() {
    let famousAuthor = await Article.aggregate([{ $group: { _id: '$author' } }]);
    famousAuthor = famousAuthor.map((elem) => elem._id);

    const followerCounter = {};
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
    let usersId = await User.find({}, { _id: 1 });
    usersId = usersId.map((elem) => elem._id).slice(0, 15);

    for (let id of usersId) {
        const followers = famousAuthor.sort(() => 0.5 - Math.random()).slice(0, 4);

        followers.forEach((author) => {
            followerCounter[author] = followerCounter[author] + 1 || 1;
        });

        const subscribeTemplate = categories.sort(() => 0.5 - Math.random()).slice(0, 5);

        let subscribe = {};
        for (let cat of subscribeTemplate) {
            subscribe[cat] = Math.floor(Math.random() * 4) + 1;
        }

        await User.findByIdAndUpdate(id, {
            follower: followers,
            subscribe,
            followee: [],
        });

        // push this followee into followers' list
        for (let uid of followers) {
            await User.updateOne({ _id: uid }, { $push: { followee: id } });
        }
    }
    console.log('done');
    for (let author in followerCounter) {
        console.log(`${author}: ${followerCounter[author]}`);
    }
}

run();
