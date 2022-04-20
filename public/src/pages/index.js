async function favoriteArticle(e) {
    async function favoriteArticle(method) {
        return await fetch('/api/user/favorite', {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                articleId,
            }),
        });
    }

    const articleId = e.parentElement.parentElement.dataset.id;
    if (e.classList.contains('favored')) {
        // TODO: Unfavorite the article
        const res = await favoriteArticle('DELETE');

        if (res.status == 200) {
            e.className = 'far fa-bookmark favorite';
            console.log('移除成功');
        } else {
            alert('取消珍藏失敗，請稍後再試W');
        }
    } else {
        // TODO: Favorite the article

        const res = await favoriteArticle('POST');

        if (res.status == 200) {
            e.className = 'fas fa-bookmark favored favorite';
            console.log('新增成功');
        } else {
            alert('珍藏文章失敗，請再試一次');
        }
    }
}

function timeTransformer(ISODateString) {
    const targetTimestamp = new Date(ISODateString).getTime();
    const currentTimestamp = new Date().getTime();
    // in minute
    let timeInterval = Math.floor((currentTimestamp - targetTimestamp) / 1000 / 60);
    if (timeInterval < 60) return `${timeInterval} 分鐘前`;

    // in hour
    timeInterval = Math.floor(timeInterval / 60);
    if (timeInterval < 24) return `${timeInterval} 小時前`;

    // in day
    timeInterval = Math.floor(timeInterval / 24);
    if (timeInterval < 4) return `${timeInterval} 天前`;

    return ISODateString.split('T')[0];
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

    if (auth) {
        let bookmarkClass = favorited ? 'fas fa-bookmark favored favorite' : 'far fa-bookmark favorite';
        bookmark = `<i class="${bookmarkClass}" onclick="favoriteArticle(this)"></i>`;
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
        // User's newsfeed loading
        let res = await fetch('/api/articles/NewsFeed', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (res.status == 200) {
            res = await res.json();
            const articles = res.data;

            articles.forEach((article) => {
                appendArticle(article, auth);
            });
        }
    } else {
        // latest article loading
        let res = await fetch('/api/articles/latest');
        if (res.status == 200) {
            res = await res.json();

            const articles = res.data;
            articles.forEach((article) => {
                appendArticle(article, auth);
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
                // const res = await fetch('/api/user/follow', {
                //     method: 'DELETE',
                //     headers: {
                //         'Content-Type': 'Application/json',
                //         Authorization: `Bearer ${token}`,
                //     },
                //     body: JSON.stringify({ followerId: authorId }),
                // });

                const res = await unFollowerAuthor(token, authorId);
                console.log(res);

                if (res.data) {
                    changeFollowerState({ authorId, remove: 'followed', add: 'nofollow' });
                } else {
                    console.log('系統異常，請稍後再試');
                }
            } else {
                // TODO: FOLLOW the user
                const res = await fetch('/api/user/follow', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'Application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ followerId: authorId }),
                });
                if (res.status == 200) {
                    changeFollowerState({ authorId, add: 'followed', remove: 'nofollow' });
                } else {
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
        let res = await fetch('/api/user/subscribe', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (res.status === 200) {
            res = await res.json();
            subscription = res.data;
            appendCategories(subscription);
        }
    } else {
        document.getElementById('subscribe-header').innerText = '#主題列表';
        let res = await fetch('/api/articles/categories');
        if (res.status == 200) {
            res = await res.json();
            const categories = {};
            res.data.forEach((cat) => {
                categories[cat] = '';
            });

            appendCategories(categories);
        }
    }
}

async function main() {
    const auth = await authenticate();
    await renderHeader(auth);
    await renderCategories(auth);
    await renderArticles(auth);
}

main();
