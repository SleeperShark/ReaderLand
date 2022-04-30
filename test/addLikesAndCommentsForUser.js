const { Article, ObjectId } = require('../server/models/schemas');

async function main(userId) {
    const likeArticle = [];
    const commentArticle = [];
    userId = ObjectId(userId);
    const articles = await Article.find({}, { _id: 1 });
    for (let article of articles) {
        if (Math.floor(Math.random() * 10 + 1) % 10 == 0) {
            console.log('user likes!');
            likeArticle.push(article._id);

            await Article.findByIdAndUpdate(article._id, { $push: { likes: userId } });

            if (Math.floor(Math.random() * 2) % 2 == 0) {
                console.log('user comments!');
                const newComment = {
                    context: 'Tester-1 comment',
                    createdAt: new Date().toISOString(),
                    reader: userId,
                };
                commentArticle.push(article._id);
                await Article.findByIdAndUpdate(article._id, { $push: { comments: newComment } });
            }
        }
    }

    console.log(likeArticle);
    console.log(commentArticle);
}

main('625cf11b01caa208ce931493');
