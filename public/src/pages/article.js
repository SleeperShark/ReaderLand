function toggleReplyEdit(replyBtn) {
    const replyEdit = replyBtn.nextSibling.nextSibling;
    const replySubmit = replyEdit.nextSibling.nextSibling;
    replyEdit.classList.toggle('hide');
    replySubmit.classList.toggle('hide');

    const hint = replyBtn.innerText;
    replyBtn.innerText = hint === '回覆' ? '收起' : '回覆';

    if (replyBtn.innerText == '收起') {
        replyEdit.focus();
    }
}

async function submitReply(submitBtn) {
    const replyEdit = submitBtn.previousSibling.previousSibling;
    const reply = replyEdit.value.trim();
    if (!reply) {
        alert('請輸入回覆內容');
        return;
    }

    const commentId = submitBtn.dataset.id;
    const articleId = new URL(window.location).searchParams.get('id');

    try {
        const { data: article, error, status } = await replyCommentAPI({ commentId, articleId, userToken: token, reply });

        if (error) {
            console.error(status);
            console.error(error);
            alert('API 異常: replyCommentAPI');
            return;
        }

        renderCommentBoard(article);
        return;
    } catch (error) {
        console.error(error);
        alert('系統異常: submit reply');
    }
}

function renderCommentBoard(article) {
    const commentContainer = document.getElementById('comment-container');
    commentContainer.innerHTML = '';
    const {
        author: { name: authorName, picture: authorPicture, _id: authorId },
    } = article;
    article.comments.reverse();

    article.comments.forEach((comment, idx) => {
        const {
            context,
            authorReply,
            createdAt,
            reader: { _id: readerId, picture: readerPic, name: readerName },
        } = comment;
        const commentBox = document.createElement('div');
        commentBox.classList.add('comment-box');

        let replyEdit = '';
        if (article.author.name == user?.name) {
            replyEdit = `
        <div class="reply-btn" onclick="toggleReplyEdit(this)">回覆</div>
        <textarea placeholder="回復&nbsp;${readerName}：" class="reply-edit hide"></textarea>
        <i class="fas fa-paper-plane reply-submit  hide" data-id="${comment._id}" onclick="submitReply(this)"></i>
        `;
        }

        commentBox.innerHTML += `
                    <div class="reader-comment">
                        <div class="comment-body">
                            <a href="#" class="avatar-container">
                                <img class="reader-avatar" src="${readerPic}" alt="reader-avatar" />
                                <div class="reader-name">${readerName}</div>
                            </a>

                            <div class="comment-bubble">
                                <div class="comment-context">${context}</div>
                            </div>
                        </div>
                        <div class="footer-container">
                            <span class="comment-time">${timeTransformer(createdAt)}</span>
                            
                            ${replyEdit}
                        </div>
                    </div>
        `;

        if (authorReply) {
            if (replyEdit) {
                commentBox.querySelector('.reply-btn').remove();
                commentBox.querySelector('.reply-edit').remove();
            }

            commentBox.innerHTML += `
            <div class="author-reply">
                        <div>
                            <div class="reply-bubble">
                                <div class="reply-context">${authorReply.context}</div>
                            </div>
                            <a href="#" class="avatar-container">
                                <img class="author-avatar" src="${authorPicture}" alt="reader-avatar" />
                                <div class="reply-name">${authorName}</div>
                            </a>
                        </div>
                        <span class="reply-time">${timeTransformer(authorReply.createdAt)}</span>
                    </div>
            `;
        }

        commentContainer.appendChild(commentBox);
        if (idx !== article.comments.length - 1) {
            commentContainer.innerHTML += '<div class="comment-divider"></div>';
        }
    });
}

async function renderArticle(auth) {
    const articleId = new URL(window.location).searchParams.get('id');
    let result;
    if (auth) {
        result = await getFullArticleAPI(articleId, token);
    } else {
        result = await getFullArticleAPI(articleId);
    }
    const article = result.data;

    // TODO: Render content of the article
    //* title
    document.getElementById('title').innerText = article.title;
    //* author avatar
    document.getElementById('author-avatar').src = article.author.picture;
    //* author name
    document.getElementById('author-name').innerText = article.author.name;
    // hide follow btn if user is author
    if (user?.userId == article.author._id) {
        document.getElementById('follow-btn').classList.add('hide');
    }
    //* created time
    document.getElementById('date').innerText = timeTransformer(article.createdAt);
    //* read count
    document.querySelector('#read .count').innerText = article.readCount;
    //* like count
    document.querySelector('#like .count').innerText = article.likes.length;
    //* comment count
    document.querySelector('#comment .count').innerText = article.comments.length;
    if (article.comments.length) {
        document.getElementById('no-comment-box').remove();
        renderCommentBoard(article);
    }

    //TODO: render context
    const contextDiv = document.getElementById('context');
    let cursor = 'head';

    while (cursor) {
        const newParagraph = document.createElement('div');
        newParagraph.classList.add('paragraph');
        const currContext = article.context[cursor];

        switch (currContext.type) {
            case 'text':
                newParagraph.innerHTML = currContext.content;
                break;
        }

        cursor = currContext.next;
        contextDiv.appendChild(newParagraph);
    }

    const followBtn = document.getElementById('follow-btn');

    if (!auth) {
        //TODO: stanger user interface
        followBtn.style.display = 'none';
        document.getElementById('favorite').style.display = 'none';
        document.getElementById('auth-comment-footer').remove();
    } else {
        //TODO: render articles with user function
        //* follow btn
        followBtn.classList.add(article.author.followed ? 'followed' : 'nofollow');
        //* comment-footer user avatar
        document.querySelector('#auth-comment-footer > img').src = user.picture;
        //* remove unauth comment-footer
        document.getElementById('unauth-comment-footer').remove();

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

        //TODO: submit comment
        const commentSubmitBtn = document.getElementById('comment-send');
        commentSubmitBtn.addEventListener('click', async () => {
            const commentArea = document.getElementById('comment-edit');
            if (!commentArea.value.trim()) {
                return;
            }

            try {
                const result = await commentArticleAPI(token, articleId, commentArea.value);

                if (result.error) {
                    console.error(error);
                    alert('留言失敗，請稍後在試');
                }

                const article = result.data;
                renderCommentBoard(article);
                //* like count update
                document.querySelector('#like .count').innerText = article.likes.length;
                //* comment count update
                document.querySelector('#comment .count').innerText = article.comments.length;
                //* commented update
                document.getElementById('comment').classList.add('commented');

                commentArea.value = '';
            } catch (error) {
                console.error(error);
                alert('系統異常: POST /api/articles/:articleId/comment');
            }
        });
    } // end of if(auth)
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
    commentBoard.classList.toggle('hide');
}
document.getElementById('comment').addEventListener('click', toggleBoard);
document.getElementById('close-board-btn').addEventListener('click', toggleBoard);
