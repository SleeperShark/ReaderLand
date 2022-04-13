const { User, Article } = require('../server/models/schemas');

async function run() {
    let famousAuthor = await Article.aggregate([{ $group: { _id: '$author' } }]);
    famousAuthor = famousAuthor.map((elem) => elem._id);
    const categories = ['投資理財', '政治', '國際', '教育', '科學', '音樂藝文', '文學', '心理', '健康與情感', '寵物', '職場產業', 'ACG', '創作', '電影戲劇', '閱讀書評'];

    let usersId = await User.find({}, { _id: 1 });
    usersId = usersId.map((elem) => elem._id).slice(0, 15);

    for (let id of usersId) {
        const followers = famousAuthor.sort(() => 0.5 - Math.random()).slice(0, 4);
        const subscribeTemplate = categories.sort(() => 0.5 - Math.random()).slice(0, 5);

        let subscribe = {};
        for (let cat of subscribeTemplate) {
            subscribe[cat] = Math.floor(Math.random() * 4) + 1;
        }

        await User.findByIdAndUpdate(id, {
            follower: followers,
            // subscribe,
        });
    }
    console.log('done');
}

run();
