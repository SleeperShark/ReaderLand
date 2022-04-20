async function renderArticle(auth) {
    const articleId = new URL(window.location).searchParams.get('id');
    let result;
    if (auth) {
        result = await getFullArticleAPI(articleId, token);
    } else {
        result = await getFullArticleAPI(articleId);
    }
    const { data: article } = result;

    console.log(article);

    //* title
    document.getElementById('title').innerText = article.title;
    //* author avatar
    document.getElementById('author-avatar').src = article.author.picture;
    //* author name
    document.getElementById('author-name').innerText = article.author.name;
    // created time
    document.getElementById('date').innerText = article.createdAt;
    if (auth) {
        //* follow btn
        document.getElementById('follow-btn').classList.add(article.author.followed ? 'followed' : 'nofollow');
        //* liked
        if (article.liked) {
            document.getElementById('like').classList.add('favored');
        }
        //* commented
        if (article.commented) {
            document.getElementById('comment').classList.add('commented');
        }
        //* favorited
        if (article.favorited) {
            document.getElementById('favorite').classList.add('favored');
        }
    } else {
        document.getElementById('follow-btn').style.display = 'none';
        document.getElementById('favorite').style.display = 'none';
    }
}

async function init() {
    const auth = await authenticate();
    await renderHeader(auth);
    await renderArticle(auth);
}

init();
