const { Article, User } = require('../server/models/schemas');

async function run() {
    // Get all User id
    let usersId = await User.find({}, { _id: 1 });
    usersId = usersId.map((elem) => elem._id.toString()).slice(0, 15);

    const days = 10;
    const daysInMilli = days * 24 * 60 * 60 * 1000;

    let fakeTimeStamp = new Date().getTime() - daysInMilli;
    const timeInterval = parseInt(daysInMilli / 1000);

    const categories = ['投資理財', '政治', '國際', '教育', '科學', '音樂藝文', '文學', '心理', '健康與情感', '寵物', '職場產業', 'ACG', '創作', '電影戲劇', '閱讀書評'];

    for (let i = 0; i < 1000; i++) {
        try {
            const author = usersId[Math.floor(Math.random() * usersId.length)];
            const category = categories.sort(() => 0.5 - Math.random()).slice(0, 2);

            let title = `000000${Math.floor(Math.random() * 1000000)}`;
            title = 'Test-' + title.substring(title.length - 6);

            const createdAt = new Date(fakeTimeStamp).toISOString();

            const readCount = Math.floor(Math.random() * 100);
            const likes = usersId.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * readCount));

            const context = `
        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
        `.trim();

            // create comments
            const comments = [];
            const praise = ['超級讚', '非常喜歡', '期待下一篇', '敲碗敲碗', '沙發'];
            let commentTime = fakeTimeStamp;

            for (let c = 0; c < Math.floor(Math.random() * likes.length); c++) {
                commentTime += Math.floor(1000 * 60 * 60 * Math.random());

                const comment = {
                    context: praise[Math.floor(Math.random() * praise.length)],
                    createdAt: new Date(commentTime),
                    reader: usersId[Math.floor(Math.random() * usersId.length)],
                };

                if (Math.floor(Math.random() * 10) % 2 == 0) {
                    commentTime += Math.floor(1000 * 60 * 60 * Math.random());
                    comment.authorReply = {
                        context: '感謝支持',
                        createdAt: new Date(commentTime),
                    };
                }

                comments.push(comment);
            }

            await Article.create({
                title,
                author,
                category,
                context,
                createdAt,
                likes,
                readCount,
                comments,
            });

            if (i % 100 == 0) {
                console.log(`Article ${i} created...`);
            }

            fakeTimeStamp += timeInterval;
        } catch (error) {
            console.log(error);
        }
    }
}

run();
