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

    // TODO: Render content of the article
    //* title
    document.getElementById('title').innerText = article.title;
    //* author avatar
    document.getElementById('author-avatar').src = article.author.picture;
    //* author name
    document.getElementById('author-name').innerText = article.author.name;
    //* created time
    document.getElementById('date').innerText = article.createdAt;
    //* read count
    document.querySelector('#read .count').innerText = article.readCount;
    //* like count
    document.querySelector('#like .count').innerText = article.likes.length;
    //* comment count
    document.querySelector('#comment .count').innerText = article.comments.length;

    const followBtn = document.getElementById('follow-btn');

    if (auth) {
        //* follow btn
        followBtn.classList.add(article.author.followed ? 'followed' : 'nofollow');
        // followBtn.dataset.id = article.author._id;
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

        //TODO: follow / unfollow author event
        followBtn.addEventListener('click', async () => {
            if (followBtn.classList.contains('followed')) {
                // unfollow author
                const result = await unFollowAuthorAPI(token, article.author._id);
                if (result.data) {
                    followBtn.classList.add('nofollow');
                    followBtn.classList.remove('followed');
                } else {
                    console.error(result);
                    alert('操作失敗');
                }
            } else {
                // follow author
                const result = await followAuthorAPI(token, article.author._id);
                if (result.data) {
                    followBtn.classList.remove('nofollow');
                    followBtn.classList.add('followed');
                } else {
                    console.error(result);
                    alert('操作失敗');
                }
            }
        });

        //TODO: like / unlike article event
        document.getElementById('like-icon').addEventListener('click', async () => {
            const likeDiv = document.getElementById('like');

            if (likeDiv.classList.contains('favored')) {
                // unlike article
                const result = await unlikeArticleAPI(token, articleId);
                if (result.data) {
                    likeDiv.classList.remove('favored');
                    document.querySelector('#like .count').innerText = result.data.length;
                } else {
                    console.error(result);
                    alert('Unlike: 系統異常');
                }
            } else {
                // like article
                const result = await likeArticleAPI(token, articleId);
                if (result.data) {
                    likeDiv.classList.add('favored');
                    document.querySelector('#like .count').innerText = result.data.length;
                } else {
                    console.error(result);
                    alert('like: 系統異常');
                }
            }
        });

        //TODO: favorite / unfavorite article event
        document.getElementById('favorite-icon').addEventListener('click', async () => {
            const favoriteDiv = document.getElementById('favorite');
            if (favoriteDiv.classList.contains('favored')) {
                // unfavorite the artilce
                const result = await unFavoriteArticleAPI(token, articleId);
                if (result.data) {
                    favoriteDiv.classList.remove('favored');
                } else {
                    console.error(result);
                    alert('系統異常: unfavorite');
                }
            } else {
                // favorite the article
                const result = await favoriteArticleAPI(token, articleId);
                if (result.data) {
                    favoriteDiv.classList.add('favored');
                } else {
                    console.error(result);
                    alert('系統異常: unfavorite');
                }
            }
        });
    } else {
        //TODO: stanger user interface
        followBtn.style.display = 'none';
        document.getElementById('favorite').style.display = 'none';
    }
}

async function init() {
    const auth = await authenticate();
    await renderHeader(auth);
    await renderArticle(auth);
}

init();

const commentBoard = document.getElementById('comment-board');
// commentBoard.style.display = 'none';
function toggleBoard(e) {
    console.log(e.target);
    if (commentBoard.style.display == 'none') {
        commentBoard.style.display = 'flex';
    } else {
        commentBoard.style.display = 'none';
    }
}
document.getElementById('comment').addEventListener('click', toggleBoard);
document.getElementById('close-board-btn').addEventListener('click', toggleBoard);
