let auth;

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
    function redirectToAuthorPage() {
        window.open(`/author.html?id=${article.author._id}`, '_blank').focus();
    }

    const {
        favorited,
        liked,
        commented,
        author: { followed, _id: authorId, picture, name, bio },
        _id: articleId,
        createdAt,
        title,
        readCount,
        likeCount,
        commentCount,
    } = article;

    const categoryHTML = article.category.map((elem) => `<span class="category">${elem}</span>`).join(' ');
    const articleElem = document.createElement('article');
    articleElem.classList.add('article');
    articleElem.dataset.id = articleId;

    let bookmark = '';
    let followBtn = '';

    if (auth) {
        // show bookmark
        let bookmarkClass = favorited ? 'fas fa-bookmark favored favorite' : 'far fa-bookmark favorite';
        bookmark = `<i class="${bookmarkClass}" onclick="favoriteArticle(this)" data-id="${articleId}"></i>`;

        // show follow button
        if (user.userId != authorId) {
            followBtn = `
<button class='profile-follow-btn${followed ? ' followed' : ' nofollow'} ${authorId}'>
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
    }

    articleElem.innerHTML = ` 
<div class="article-header">
    <div class='author-info'>
        <img class="author-picture" src="${picture}" alt="" />

        <div class='author-profile'>
            <img class="profile-picture" src="${picture}" alt="" />
            <div class="profile-name">${name}</div>
            <div class='profile-bio'>
                ${bio || ''}
            </div>
            ${followBtn}
        </div>

    </div>

    <div class="details" data-id="${authorId}">
        <span class="author">${name}</span>
        <span class="date">${timeTransformer(createdAt)}</span>
    </div>

    ${bookmark}
</div>

<a href="/article.html?id=${article._id}" target="blank"  class="title">${title}</a>

<div class="categories">
    ${categoryHTML}
</div>

<div class="preview">
    ${article.preview}
</div>
<div class="article-footer">
    <div class="feedback read">
        <i class="far fa-eye"></i>
        <span class="count">${readCount}</span>
    </div>
    <div class="feedback like">
        <i class="fas fa-heart${liked ? ' favored' : ''}"></i>
        <span class="count">${likeCount}</span>
    </div>
    <div class="feedback comment">
        <i class="far fa-comment-dots${commented ? ' favored' : ''}"></i>
        <span class="count">${commentCount}</span>
    </div>
</div>
    `;

    document.getElementById('articles').appendChild(articleElem);

    // TODO: add event listener to author name and avatar to redirect to auhtor page
    articleElem.querySelector('.details .author').addEventListener('click', redirectToAuthorPage);
    articleElem.querySelector('.profile-picture').addEventListener('click', redirectToAuthorPage);
    articleElem.querySelector('.profile-name').addEventListener('click', redirectToAuthorPage);

    //TODO: add show/hide profile event listener
    const authorPicture = articleElem.querySelector('.author-picture');
    authorPicture.addEventListener('click', redirectToAuthorPage);
    const $profile = $(authorPicture).next();

    $(authorPicture)
        .mouseover(function () {
            $profile.css('display', 'flex');
        })
        .mouseleave(async function () {
            await new Promise((r) => {
                setTimeout(() => r(), 800);
            });

            if (!$(this).next().is(':hover')) {
                $profile.hide();
            }
        });

    $profile
        .mouseover(function () {
            $profile.css('display', 'flex');
        })
        .mouseleave(function () {
            $profile.hide();
        });

    //TODO: follow/unfollow user EventListener
    $profile.children('.profile-follow-btn').click(async function () {
        const btnClass = $(this).attr('class');

        if (btnClass.includes('followed')) {
            // TODO: unfollow user
            const { error, status } = await unFollowAuthorAPI(token, article.author._id.toString());
            if (error) {
                console.error(status);
                console.error(error);
                alert('取消失敗，請稍後在試');
                return;
            }

            $(`.profile-follow-btn.${article.author._id}`).each(function () {
                $(this).addClass('nofollow');
                $(this).removeClass('followed');
            });
        } else {
            // TODO: follow user
            const { error, status } = await followAuthorAPI(token, article.author._id.toString());
            if (error) {
                console.error(status);
                console.error(error);
                alert('取消失敗，請稍後在試');
                return;
            }

            $(`.profile-follow-btn.${article.author._id}`).each(function () {
                $(this).removeClass('nofollow');
                $(this).addClass('followed');
            });
        }
    });

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
        const { data, error } = await getNewsfeedAPI(token);

        if (data) {
            data.userFeeds.forEach((article) => {
                appendArticle(article, auth);
            });

            if (data.EndOfFeed) {
                alert('動態牆到底');
                return data.EndOfFeed;
            }
        }
    } else {
        //TODO: Get latest article
        const { data, error } = await getLatestArticles();
        if (data) {
            data.forEach((article) => {
                appendArticle(article);
            });
        }
    }
}

function appendCategories(subscription) {
    const conatiner = document.getElementById('category-container');

    const category = Object.keys(subscription);
    category.sort((a, b) => subscription[b] - subscription[a]);

    category.forEach((category) => {
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

        const { data: categories, error, status } = await getUserSubscription(token);
        if (categories) {
            console.log(categories);
            appendCategories(categories);
        } else {
            console.error(status);
            console.error(error);
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

async function renderHotArticles() {
    const { data: hotArticles, error, status } = await getHotArticlesAPI();

    if (error) {
        console.error(status);
        console.error(error);
    }

    document.querySelectorAll('.hot-article').forEach((articleDiv, idx) => {
        const { title, _id, author, createdAt } = hotArticles[idx];
        articleDiv.querySelector('.hot-article-title').innerText = title;
        articleDiv.querySelector('.hot-article-author').innerText = author.name;
        articleDiv.querySelector('.hot-article-date').innerText = timeTransformer(createdAt);

        articleDiv.addEventListener('click', () => {
            window.open(`/article.html?id=${_id}`, '_blank');
        });
    });
}

async function init() {
    auth = await authenticate();
    await renderHeader(auth);
    await renderCategories(auth);
    await renderArticles(auth);
    await renderHotArticles();
}

init();

var loading = false;
//TODO: Load more feed when scroll to btm
$(window).scroll(async function () {
    if ($(window).scrollTop() + $(window).height() + 110 >= $(document).height()) {
        if (loading || !auth) {
            return;
        }

        loading = true;
        const endOfFeed = await renderArticles(auth);
        if (!endOfFeed) {
            loading = false;
        }
    }
});
