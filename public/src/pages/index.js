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

function appendArticle(article) {
    const categoryHTML = article.category.map((elem) => `<span class="category">${elem}</span>`).join(' ');
    const articleElem = document.createElement('article');
    articleElem.classList.add('article');
    articleElem.dataset.id = article._id;

    const { favorited, liked, commented } = article;

    let bookmark = favorited ? 'fas fa-bookmark favored favorite' : 'far fa-bookmark favorite';

    articleElem.innerHTML = ` 
<div class="article-header">
    <img class="author-picture" src="${article.author.picture}" alt="" />
    <div class="details" data-id="${article.author._id}">
        <span class="author">${article.author.name}</span>
        <span class="date">${timeTransformer(article.createdAt)}</span>
    </div>
    <i class="${bookmark}" onclick="favoriteArticle(this)"></i>
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

async function loadingArticles(auth) {
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
                appendArticle(article);
            });
        }
    } else {
        // latest article loading
    }
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
        // let res = await fetch('/api/articles/categories');
    }
}

async function main() {
    const auth = await authenticate();
    await renderHeader(auth);
    await renderCategories(auth);
}

main();