async function favoriteArticle(e) {
    const articleId = e.dataset.id;
    if (e.classList.contains('favored')) {
        // TODO: Unfavorite the article
        const result = await unFavoriteArticleAPI(token, articleId);

        if (result.data) {
            e.className = 'far fa-bookmark favorite';
            console.log('移除成功');
        } else {
            console.log(result);
            alert('取消珍藏失敗，請稍後再試');
        }
    } else {
        // TODO: Favorite the article
        const result = await favoriteArticleAPI(token, articleId);

        if (result.data) {
            e.className = 'fas fa-bookmark favored favorite';
            console.log('新增成功');
        } else {
            console.log(result);
            alert('珍藏文章失敗，請再試一次');
        }
    }
}

function appendArticle(article, auth) {
    const categoryHTML = article.category.map((elem) => `<span class="category">${elem}</span>`).join(' ');
    const articleElem = document.createElement('article');
    articleElem.classList.add('article');
    articleElem.dataset.id = article._id;

    const {
        favorited,
        liked,
        commented,
        author: { followed },
    } = article;

    let bookmark = '';
    let followBtn = '';

    if (auth) {
        // show bookmark
        let bookmarkClass = favorited ? 'fas fa-bookmark favored favorite' : 'far fa-bookmark favorite';
        bookmark = `<i class="${bookmarkClass}" onclick="favoriteArticle(this)" data-id="${article._id}"></i>`;

        // show follow button
        followBtn = `
<button class='profile-follow-btn${followed ? ' followed' : ' nofollow'}' data-authorid="${article.author._id}">
    <span class="nofollow-text" >
        <i class="fas fa-thumbs-up"></i>
        追蹤
    </span>
    <span class="followed-text" >
        <i class="far fa-check-square"></i>                
        已追蹤
    </span>
</button>
        `;
    }

    articleElem.innerHTML = ` 
<div class="article-header">
    <div class='author-info'>
        <img class="author-picture" src="${article.author.picture}" alt="" />

        <div class='author-profile'>
            <img class="profile-picture" src="${article.author.picture}" alt="" />
            <div class="profile-name">${article.author.name}</div>
            <div class='profile-bio'>
                ${article.author.bio || ''}
            </div>
            ${followBtn}
        </div>

    </div>

    <div class="details" data-id="${article.author._id}">
        <span class="author">${article.author.name}</span>
        <span class="date">${timeTransformer(article.createdAt)}</span>
    </div>

    ${bookmark}
</div>

<a href="/article.html?id=${article._id}" class="title">${article.title}</a>

<div class="categories">
    ${categoryHTML}
</div>

<div class="preview">
    ${article.preview}
</div>
<div class="article-footer">
    <div class="feedback read">
        <i class="far fa-eye"></i>
        <span class="count">${article.readCount}</span>
    </div>
    <div class="feedback like">
        <i class="fas fa-heart${liked ? ' favored' : ''}"></i>
        <span class="count">${article.likeCount}</span>
    </div>
    <div class="feedback comment">
        <i class="far fa-comment-dots${commented ? ' favored' : ''}"></i>
        <span class="count">${article.commentCount}</span>
    </div>
</div>
    `;

    document.getElementById('articles').appendChild(articleElem);

    return;
}

function changeFollowerState({ authorId, remove, add }) {
    document.querySelectorAll(`button.profile-follow-btn[data-authorid="${authorId}"]`).forEach((btn) => {
        btn.classList.remove(remove);
        btn.classList.add(add);
        console.log('change state...');
    });
}

async function renderArticles(auth) {
    if (auth) {
        // TODO: Get customized newsfeed
        const result = await getNewsfeed(token);

        if (result.data) {
            result.data.forEach((article) => {
                appendArticle(article, auth);
            });
        }
    } else {
        //TODO: Get latest article
        const result = await getLatestArticles();
        if (result.data) {
            result.data.forEach((article) => {
                appendArticle(article);
            });
        }
    }

    //TODO: profile presentation when hover
    document.querySelectorAll('.author-picture').forEach((elem) => {
        const profile = elem.nextSibling.nextSibling;
        profile.addEventListener('mouseover', () => {
            profile.dataset.status = 'show';
        });
        profile.addEventListener('mouseleave', () => {
            profile.dataset.status = 'hide';
            profile.style.display = 'none';
        });
        elem.addEventListener('mouseover', () => {
            profile.style.display = 'flex';
        });
        elem.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (profile.dataset.status === 'hide') {
                    console.log('test');
                    profile.style.display = 'none';
                }
            }, 600);
        });
    });

    //TODO: follow/unfollow user EventListener
    document.querySelectorAll('.profile-follow-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const authorId = btn.dataset.authorid;

            // check follow state

            if (btn.classList.contains('followed')) {
                // TODO: UNFOLLOW the author

                const result = await unFollowAuthorAPI(token, authorId);

                if (result.data) {
                    changeFollowerState({ authorId, remove: 'followed', add: 'nofollow' });
                } else {
                    console.log(result);
                    console.log('系統異常，請稍後再試');
                }
            } else {
                // TODO: FOLLOW the user
                const result = await followAuthorAPI(token, authorId);
                if (result.data) {
                    changeFollowerState({ authorId, add: 'followed', remove: 'nofollow' });
                } else {
                    console.log(result);
                    console.log('系統異常，請稍後再試');
                }
            }
        });
    });
}

function appendCategories(subscription) {
    const conatiner = document.getElementById('category-container');

    Object.keys(subscription).forEach((category) => {
        const subscribeCategory = document.createElement('div');
        subscribeCategory.classList.add('subscribe-category');
        subscribeCategory.innerHTML = `
<span class="category-name">${category}</span>
<span class="category-weight">${subscription[category]}</span>
        `;
        conatiner.appendChild(subscribeCategory);
    });
    return;
}

async function renderCategories(auth) {
    if (auth) {
        document.getElementById('subscribe-header').innerText = '#訂閱主題';

        const result = await getUserSubscription(token);
        if (result.data) {
            appendCategories(result.data);
        } else {
            console.log(result);
            alert('系統異常: getUserSubscription');
        }
    } else {
        document.getElementById('subscribe-header').innerText = '#主題列表';

        const result = await getCategoriesAPI();
        if (result.data) {
            const categories = {};
            result.data.forEach((cat) => {
                categories[cat] = '';
            });
            appendCategories(categories);
        } else {
            console.log(result);
            alert('系統異常: getCategoriesAPI');
        }
    }
}

async function init() {
    const auth = await authenticate();
    await renderHeader(auth);
    await renderCategories(auth);
    await renderArticles(auth);
}

init();
