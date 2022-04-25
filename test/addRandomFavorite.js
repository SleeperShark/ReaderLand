const { Article, User, ObjectId } = require('../server/models/schemas');

async function main(userId) {
    userId = ObjectId(userId);

    const articles = await Article.find({}, { _id: 1, createdAt: 1 });

    const favorite = [];
    articles.forEach((article) => {
        if (Math.floor(Math.random() * 10 + 1) % 10 == 0) {
            let timeStamp = new Date(article.createdAt).getTime() + Math.floor(Math.random() * 1000 * 60 * 60);
            timeStamp = new Date(timeStamp).toISOString();

            favorite.push({
                articleId: article._id,
                createdAt: timeStamp,
            });
        }
    });

    favorite.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // console.log(favorite.length);

    await User.findByIdAndUpdate(userId, { $set: { favorite } });

    console.log('update finish...');
}

main('62664a63fff46c7595b4c5e2');
