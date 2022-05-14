const articleId = new URL(window.location).searchParams.get('id');
const commentId = new URL(window.location).searchParams.get('commentId');

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
        await toastBaker({ icon: 'warning', text: '請輸入回覆內容' });
        return;
    }

    const commentId = submitBtn.dataset.id;
    const articleId = new URL(window.location).searchParams.get('id');

    try {
        const { error, status } = await replyCommentAPI({ commentId, articleId, userToken: token, reply });

        if (error) {
            console.error(status);
            console.error(error);
            await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
        }
        return;
    } catch (error) {
        console.error(error);
        await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
    }
}

function enterToSubmit(event) {
    if (event.keyCode == 13 && !event.shiftKey) {
        event.target.nextElementSibling.click();
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
            _id: commentId,
        } = comment;
        const commentBox = document.createElement('div');
        commentBox.classList.add('comment-box');
        commentBox.id = commentId;

        let replyEdit = '';
        if (article.author.name == user?.name) {
            replyEdit = `
        <div class="reply-btn" onclick="toggleReplyEdit(this)">回覆</div>
        <textarea placeholder="回復&nbsp;${readerName}：" class="reply-edit hide" onkeypress="return enterToSubmit(event)" ></textarea>
        <i class="fas fa-paper-plane reply-submit  hide" data-id="${comment._id}" onclick="submitReply(this)"></i>
        `;
        }

        commentBox.innerHTML += `
                    <div class="reader-comment">
                        <div class="comment-body">
                            <a href="/author.html?id=${readerId}" class="avatar-container">
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
                            <a href="/author.html?id=${authorId}" class="avatar-container">
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
    let result;
    if (auth) {
        result = await getFullArticleAPI(articleId, token);
    } else {
        result = await getFullArticleAPI(articleId);
    }
    const article = result.data;

    // no matched article
    if (result.status == 400) {
        window.location.href = '/404.html';
    }

    // TODO: Render content of the article
    //* title
    document.getElementById('title').innerText = article.title;

    //* author avatar
    const avatar = document.getElementById('author-avatar');
    avatar.src = article.author.picture;
    avatar.addEventListener('click', () => {
        window.location.href = `/author.html?id=${article.author._id}`;
    });

    //* author name
    const name = document.getElementById('author-name');
    name.innerText = article.author.name;
    name.addEventListener('click', () => {
        window.location.href = `/author.html?id=${article.author._id}`;
    });

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

    //TODO: render category
    article.category.forEach((cat) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category');
        categoryDiv.innerText = cat;
        document.getElementById('category-container').appendChild(categoryDiv);
    });

    //TODO: render context
    const contextDiv = document.getElementById('context');
    let cursor = article.head;

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
                    await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
                }
            } else {
                // follow author
                const result = await followAuthorAPI(token, article.author._id);
                if (result.data) {
                    followBtn.classList.remove('nofollow');
                    followBtn.classList.add('followed');
                } else {
                    console.error(result);
                    await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
                }
            }
        });

        //TODO: like / unlike article event
        document.getElementById('like-icon').addEventListener('click', async () => {
            const likeDiv = document.getElementById('like');

            if (likeDiv.classList.contains('favored')) {
                // unlike article
                const result = await unlikeArticleAPI(token, articleId);
                if (typeof result.data == 'number') {
                    likeDiv.classList.remove('favored');
                } else {
                    console.error(result);
                    await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
                }
            } else {
                // like article
                const result = await likeArticleAPI(token, articleId);
                if (result.data) {
                    likeDiv.classList.add('favored');
                } else {
                    console.error(result);
                    await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
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
                    await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
                }
            } else {
                // favorite the article
                const result = await favoriteArticleAPI(token, articleId);
                if (result.data) {
                    favoriteDiv.classList.add('favored');
                } else {
                    console.error(result);
                    await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
                }
            }
        });

        const commentSubmitBtn = document.getElementById('comment-send');
        const commentArea = document.getElementById('comment-edit');
        //TODO: submit comment event
        commentSubmitBtn.addEventListener('click', async () => {
            if (!commentArea.value.trim()) {
                await toastBaker({ icon: 'warning', text: '請輸入留言內容。' });
                return;
            }

            try {
                const { error } = await commentArticleAPI(token, articleId, commentArea.value);

                if (error) {
                    console.error(error);
                    await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
                }

                commentArea.value = '';
                // document.getElementById('comment-container').scrollTop = 0;
            } catch (error) {
                console.error(error);
                await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
            }
        });
        //TODO: submit comment when hit enter
        commentArea.addEventListener('keypress', (e) => {
            if (e.keyCode == 13 && !e.shiftKey) {
                e.preventDefault();
                commentSubmitBtn.click();
            }
        });
    } // end of if(auth)
}

function EnterToSubmitReplyEvent() {
    //TODO: enter submit reply
    document.querySelectorAll('.comment-box').forEach((commentBox) => {
        const replyEdit = commentBox.querySelector('.reply-edit');
        if (replyEdit) {
            replyEdit.addEventListener('keypress', (e) => {
                if (e.keyCode == 13 && !e.shiftKey) {
                    commentBox.querySelector('.reply-submit').click();
                }
            });
        }
    });
}

async function init() {
    document.querySelector('main').style.display = 'none';

    const auth = await authenticate();
    await renderHeader(auth);
    await renderArticle(auth);

    document.querySelector('.lds-spinner').style.display = 'none';
    document.querySelector('main').style.display = 'block';

    // EnterToSubmitReplyEvent();

    const likeCountSpan = document.querySelector('i#like-icon .count');
    const readCountSpan = document.querySelector('i#read-icon .count');
    const commentCountSpan = document.querySelector('i#comment-icon .count');
    //TODO: establish socket event for updating author feedback
    if (auth) {
        socket.emit('article-register', JSON.stringify({ articleId }));

        socket.on('update-like', (likeCount) => {
            likeCountSpan.innerText = likeCount;
        });

        socket.on('update-read', (readCount) => {
            readCountSpan.innerText = readCount;
        });

        socket.on('update-comment', (msg) => {
            const articleObj = JSON.parse(msg);
            renderCommentBoard(articleObj);
            console.log(articleObj);
            console.log(commentCountSpan.innerText);
            commentCountSpan.innerText = articleObj.comments.length;

            if (articleObj.commentEvent) {
                console.log('comment Event');
                document.getElementById('new-comment-hint').classList.remove('hide');
            }
        });
    }

    // pop out comment board if commentId in query string
    if (commentId) {
        // show comment board
        document.getElementById('comment-board').classList.remove('hide');
        document.getElementById(commentId).scrollIntoView({ behavior: 'smooth' });
        document.getElementById(commentId).classList.add('shine');
    }
}

init();

//TODO: scroll to top when click new comment hint
document.getElementById('new-comment-hint').addEventListener('click', (evt) => {
    document.getElementById('comment-container').scrollTo({ top: 0, behavior: 'smooth' });
    evt.target.classList.add('hide');
});

const commentBoard = document.getElementById('comment-board');
function toggleBoard() {
    commentBoard.classList.toggle('hide');
}
document.getElementById('comment').addEventListener('click', toggleBoard);
document.getElementById('close-board-btn').addEventListener('click', toggleBoard);

//TODO: close comment board when press esc
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        commentBoard.classList.add('hide');
    }
});

// TODO: copy link to clipboard when click link icon
document.querySelector('#copy-link-icon').addEventListener('click', async () => {
    try {
        const type = 'text/plain';
        const blob = new Blob([window.location.href], { type });
        const data = [new ClipboardItem({ [type]: blob })];

        await navigator.clipboard.write(data);
    } catch (error) {
        alert('error');
        console.error(error);
    }
});

//TODO: increase readCount when scroll to bottom
$(window).scroll(async function () {
    if ($(window).scrollTop() + $(window).height() + 110 >= $(document).height()) {
        $(window).off('scroll');

        const { error, status } = await readArticleAPI(articleId);

        if (error) {
            console.error(status);
            console.error(error);
            // alert('Error: readArticleAPI');
            return;
        }
    }
});
