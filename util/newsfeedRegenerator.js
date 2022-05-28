require('dotenv').config({ path: __dirname + '/../.env' });
const { User: UserSchema } = require(`${__dirname}/../server/models/schemas`);
const ArticleModel = require(`${__dirname}/../server/models/article_model`);
const Cache = require(`${__dirname}/cache`);
const { sleepInSec } = require(`${__dirname}/util`);

async function regenerateNewsfeed() {
    //TODO: get all user's newsfeed key in cache
    let usersId = await Cache.keys('*_newsfeed');
    usersId = usersId.map((elem) => elem.split('_')[0]);

    for (let i = 0; i < usersId.length; i++) {
        try {
            console.log(`Regenerate User ${usersId[i]}'s newsfeed...`);
            const preference = await UserSchema.findById(usersId[i], { follower: 1, subscribe: 1 });
            await ArticleModel.generateNewsFeedInCache({ userId: usersId[i], preference });
        } catch (error) {
            console.log('[ERROR]: error in generate newsfeed for user ' + usersId[i]);
            console.error(new Date().toISOString());
            console.error(error);
            console.error();
        }
    }

    return;
}

async function main() {
    try {
        console.log(`${new Date().toISOString()}: Newsfeed regenerator awake...`);
        console.time();

        //Sleep a while for redis connecction
        await sleepInSec(1, 'Waiting for redis awake...');

        await regenerateNewsfeed();

        if (!Cache.ready) {
            console.error(new Date().toISOString());
            console.error('ERROR: Cache conneted failed, please check redis status...');
            process.exit();
        }

        console.log('Task finish...');
        console.timeEnd();
        console.log('');

        process.exit();
    } catch (error) {
        console.log('[ERROR] regenerateNewsfeed');
        console.error(new Date().toISOString());
        console.error(error);
        console.error();

        process.exit();
    }
}

main();
