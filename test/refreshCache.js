const Cache = require(`${__dirname}/../util/cache`);
const { User } = require(`${__dirname}/../server/models/schemas`);

const { generateNewsFeed } = require(`${__dirname}/../server/models/article_model`);

async function main() {
    await new Promise((r) => {
        setTimeout(() => {
            console.log('Waiting DB Connection...');
            r();
        }, 1000);
    });
    await Cache.flushall();
    const usersId = await User.find({}, { _id: 1 }).limit(20);
    for (let { _id } of usersId) {
        await generateNewsFeed(_id);
    }

    process.exit();
}

main();
