let auth;
const loadingIcon = document.querySelector('.lds-spinner');
let allCategory;

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

function appendArticle({ article, auth, container }) {
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

    container.appendChild(articleElem);

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

async function renderArticles(auth, refresh = false) {
    // hide all article disaply
    const renderType = document.querySelector('.switch.selected').dataset.type;
    const container = document.getElementById(`${renderType}-article-container`);

    let articles;
    let end;

    if (renderType == 'newsfeed') {
        const { data, error } = await getNewsfeedAPI(token, refresh);

        if (error) {
            alert('載入動態牆失敗，請稍後在試...');
            console.error(error);
            return;
        }

        if (data.noPreference) {
            // Render Empty newfeed div
            if (document.getElementById('empty-newsfeed')) return;

            loadingIcon.style.display = 'none';
            const noPreferenceDiv = document.createElement('div');
            noPreferenceDiv.id = 'empty-newsfeed';
            noPreferenceDiv.innerHTML = `
                <img id="empty-newsfeed-icon" src='https://d12aekp9ye7tfn.cloudfront.net/icon/no_preference.png'/>
                <div id="empty-text-container">
                    <div>你喜歡什麼樣的文章呢?</div>
                    <div>點擊 <a href="/profile.html?to=subscribe">此處</a> 訂閱主題來豐富個人化的動態內容吧 (❛◡❛✿)
                </div>
            `;
            document.getElementById('newsfeed-article-container').append(noPreferenceDiv);
            return;
        }

        articles = data.userFeeds;
        end = data.EndOfFeed;
    } else if (renderType == 'latest') {
        let query = '';
        if (refresh) {
            query = '';
        } else if (container.lastElementChild) {
            query = `?lastArticleId=${container.lastElementChild.dataset.id}`;
        }
        const {
            data: { latest, EndOfFeed },
            error,
        } = await getLatestArticles(token, query);

        if (error) {
            alert('載入動態牆失敗，請稍後再試...');
            console.error(error);
            return;
        }

        articles = latest;
        end = EndOfFeed;
    } else {
        //Category fetch
        let query = `?category=${renderType}`;
        if (!refresh && container.lastElementChild) {
            query += `&lastArticleId=${container.lastElementChild.dataset.id}`;
        }
        //TODO: render category
        const {
            data: { categoryArticles, EndOfFeed },
            error,
        } = await getCategoryArticleAPI(token, query);

        if (error) {
            alert('載入動態牆失敗，請稍後再試...');
            console.error(error);
            return;
        }

        articles = categoryArticles;
        end = EndOfFeed;
    }

    loadingIcon.style.display = 'none';

    for (let article of articles) {
        appendArticle({ article, auth, container });
    }

    return end;
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

        if (error) {
            console.error(status);
            console.error(error);
            alert('系統異常: getUserSubscription');
            return;
        }

        if (categories) {
            appendCategories(categories);
        }
    } else {
        document.getElementById('subscribe-header').innerText = '#主題列表';

        let result;

        if (allCategory) {
            result = allCategory;
        } else {
            const { data, error } = await getCategoriesAPI();
            if (error) {
                alert('載入主題標籤失敗...');
                return;
            }
            result = data;
        }

        const categories = {};
        result.forEach((cat) => {
            categories[cat] = '';
        });

        appendCategories(categories);
    }
}

async function renderSwitchCategorySelection() {
    const { data: categories, error } = await getCategoriesAPI();
    if (error) {
        alert('載入主題失敗...');
        console.error(error);
        return;
    }

    allCategory = categories;

    const selection = document.getElementById('category-select');
    const categorySpan = document.querySelector('#category-display span');

    categories.forEach((cat) => {
        const catOption = document.createElement('div');
        catOption.innerText = cat;
        catOption.value = cat;
        catOption.classList.add('category-option');
        selection.append(catOption);
    });

    selection.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('category-option')) return;

        const targetType = e.target.innerText;

        //TODO: record currType state
        const { type: currType } = switchContainer.dataset;
        scrollRecord[currType] = window.scrollY;

        document.querySelector(`#${currType}-article-container`).classList.add('hide');

        //TODO: Setting state for targetType
        categorySpan.innerText = targetType;
        categorySwitch.dataset.type = targetType;
        switchContainer.dataset.type = targetType;

        document.querySelector('.switch.selected').classList.remove('selected');
        categorySwitch.classList.add('selected');

        let container;
        container = document.getElementById(`${targetType}-article-container`);

        if (container) {
            // Display container
            container.classList.remove('hide');
            window.scroll({ top: scrollRecord[targetType] || 0 });
        } else {
            //TODO: create new Div and loading article
            container = document.createElement('div');
            container.id = `${targetType}-article-container`;
            container.classList.add('article-container');

            document.getElementById('articles-display').append(container);
            loadingIcon.style.display = 'inline-block';
            //TODO: loading articles
            await renderArticles(auth);
        }

        //TODO: hide out currType switch and select target switch
        hideSelectionBox();
    });
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
    await renderSwitchCategorySelection();

    await renderCategories(auth);
    if (!auth) {
        document.getElementById('newsfeed-switch').remove();
        document.getElementById('latest-switch').classList.add('selected');
        document.getElementById('latest-article-container').classList.remove('hide');
        switchContainer.dataset.type = 'latest';
    } else {
        document.getElementById('newsfeed-article-container').classList.remove('hide');
        switchContainer.dataset.type = 'newsfeed';
    }

    await renderArticles(auth);

    await renderHotArticles();
}

init();

const loadigng = {
    latestLoading: false,
    newsfeedLoading: false,
};
//TODO: Load more feed when scroll to btm
$(window).scroll(async function () {
    if ($(window).scrollTop() + $(window).height() + 110 >= $(document).height()) {
        const type = document.querySelector('.switch.selected').dataset.type;
        if (loadigng[`${type}Loading`]) {
            return;
        }

        loadigng[`${type}Loading`] = true;
        const endOfFeed = await renderArticles(auth);
        if (!endOfFeed) {
            loadigng[`${type}Loading`] = false;
        } else {
            //TODO: render End of feed DIV'
            console.log('End of the articles feed');
            const endDiv = document.createElement('div');
            endDiv.classList.add('end-div');
            endDiv.innerHTML = `
                <img src="https://d12aekp9ye7tfn.cloudfront.net/icon/end_of_feeds.png"/>
                <div class='end-text-container'>
                    <div class='first-end-text'>沒有文章囉 ~ </div>
                    <div class='second-end-text'>點擊刷新獲得最新動態 ヽ(✿ﾟ▽ﾟ)ノ</div>
                </div>
            `;
            document.getElementById(`${type}-article-container`).append(endDiv);
        }
    }
});

//TODO: switch event listener
const scrollRecord = {};
const switchContainer = document.getElementById('switch-container');
const switches = document.querySelectorAll('.switch');

switches.forEach((switchBtn) => {
    switchBtn.addEventListener('click', async (e) => {
        const currSwitch = document.querySelector('.switch.selected');
        if (currSwitch == switchBtn || switchBtn.id == 'category-switch') {
            return;
        }

        currSwitch.classList.remove('selected');
        switchBtn.classList.add('selected');

        const { type: currType } = currSwitch.dataset;
        const { type: targetType } = switchBtn.dataset;

        scrollRecord[currType] = window.scrollY;

        document.getElementById(`${currType}-article-container`).classList.add('hide');

        const targetContainer = document.getElementById(`${targetType}-article-container`);

        if (!targetContainer.children.length) {
            loadingIcon.style.display = 'block';
            await renderArticles(auth);
        }

        targetContainer.classList.remove('hide');
        window.scroll({ top: scrollRecord[targetType] || 0 });

        switchContainer.dataset.type = targetType;
    });
});

document.querySelectorAll('.refresh').forEach((refreshBtn) => {
    refreshBtn.addEventListener('click', async () => {
        const currSwitch = document.querySelector('.switch.selected');
        const type = currSwitch.dataset.type;
        scrollRecord[type] = 0;

        document.getElementById(`${type}-article-container`).innerHTML = '';
        loadingIcon.style.display = 'inline-block';

        await renderArticles(auth, 'true');
    });
});

// TODO: Toggle category selection
const categorySwitch = document.getElementById('category-switch');
const categorySelectBox = document.getElementById('category-select');
const toggleHint = document.getElementById('toggle-hint');

function hideSelectionBox() {
    categorySelectBox.classList.add('hide');
    toggleHint.classList.remove('fa-angle-up');
    toggleHint.classList.add('fa-angle-down');
}

categorySwitch.addEventListener('mouseover', () => {
    categorySelectBox.classList.remove('hide');
    toggleHint.classList.remove('fa-angle-down');
    toggleHint.classList.add('fa-angle-up');
});

categorySwitch.addEventListener('mouseleave', hideSelectionBox);
