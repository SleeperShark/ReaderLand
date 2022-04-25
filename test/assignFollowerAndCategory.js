const { User, Article, Category } = require('../server/models/schemas');

async function run() {
    let famousAuthor = await Article.aggregate([{ $group: { _id: '$author' } }]);
    famousAuthor = famousAuthor.map((elem) => elem._id);

    const followerCounter = {};
    let categories = await Category.find({}, { _id: 0, category: 1 });
    categories = categories.map((elem) => elem.category);

    console.log(categories);

    let usersId = await User.find({}, { _id: 1 });
    usersId = usersId.map((elem) => elem._id);

    for (let id of usersId) {
        const followers = famousAuthor.sort(() => 0.5 - Math.random()).slice(0, 4);

        followers.forEach((author) => {
            followerCounter[author] = followerCounter[author] + 1 || 1;
        });

        const subscribeTemplate = categories.sort(() => 0.5 - Math.random()).slice(0, 5);

        let subscribe = {};
        for (let cat of subscribeTemplate) {
            subscribe[cat] = Math.floor(Math.random() * 10) + 1;
        }

        await User.findByIdAndUpdate(id, {
            follower: followers,
            subscribe,
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
