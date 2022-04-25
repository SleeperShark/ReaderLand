let allCategory;

//TODO: render favorite article
function renderFavorite(favoriteArticles) {
    const favoritePage = document.getElementById('favorite-page');
    favoriteArticles.reverse();
    favoriteArticles.forEach((article) => {
        const { articleId, title, author, readCount, likeCount, commentCount, articleCreatedAt } = article;
        const articleDiv = document.createElement('div');

        const categoryHTML = article.category.reduce((accu, category) => (accu += `<div class="category">${category}</div>`), '');

        articleDiv.innerHTML = `
<div class="favorite-article">
            <i class="fas fa-bookmark" data-id="${articleId}"></i>
            <div class="unfavorite-hint" >取消珍藏</div>

            <a href="/article.html?id=${articleId}" class="title">${title}</a>

            <div class="category-container">
                ${categoryHTML}
            </div>

            <div class="article-footer">
                <div class="left">
                    <img src="${author.picture}" alt="" />
                    <div class="name-date">
                        <a href="#" class="author-name">${author.name}</a>
                        <div class="post-date">${timeTransformer(articleCreatedAt)}</div>
                    </div>
                </div>
                <div class="right">
                    <div class="feedback read">
                        <i class="far fa-eye"></i>
                        <span class="count">${readCount}</span>
                    </div>
                    <div class="feedback like">
                        <i class="fas fa-heart"></i>
                        <span class="count">${likeCount}</span>
                    </div>
                    <div class="feedback comment">
                        <i class="far fa-comment-dots"></i>
                        <span class="count">${commentCount}</span>
                    </div>
                </div>
            </div>
        </div>`;
        favoritePage.appendChild(articleDiv);
    });

    // unfavortie enevt
    document.querySelectorAll('.favorite-article > .fa-bookmark').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            const { error, data, status } = await unFavoriteArticleAPI(token, btn.dataset.id);
            if (error) {
                console.error(status);
                console.error(error);
                alert('系統異常: unFavoriteArticleAPI');
                return;
            }

            alert('成功移除珍藏');
            btn.parentElement.remove();
        });
    });
}

//TODO: render personal subscription
async function renderSubscribe(subscribe) {
    function createDivider() {
        const divider = document.createElement('div');
        divider.classList.add('category-divider');
        categoryContainer.appendChild(divider);
    }

    function appendCategoryDiv(category, weight) {
        const categoryDiv = document.createElement('div');
        categoryDiv.dataset.category = category;

        categoryDiv.classList.add('category');
        if (weight) {
            categoryDiv.classList.add('subscribe');
        }

        categoryDiv.innerHTML = `
<div class="category-name">
    <span class="category-tag">#</span>
    ${category}
</div>
<input type="number" class="category-weight" min="0" max="10" value="${weight || 1}" />
<span class="subscribe-btn">訂閱</span>
        `;
        categoryContainer.appendChild(categoryDiv);
    }

    const categoryContainer = document.getElementById('subscribe-page');
    categoryContainer.innerHTML = '';

    if (!allCategory) {
        const { data } = await getCategoriesAPI();
        allCategory = data;
    }

    // Render peronal Subscription
    const personalCategory = [];
    Object.keys(subscribe).forEach((cat) => {
        personalCategory.push([cat, subscribe[cat]]);
    });

    personalCategory.sort((a, b) => b[1] - a[1]);
    personalCategory.forEach(([cat, weight]) => appendCategoryDiv(cat, weight));

    // Add divider between subscribe and unsubscribe
    createDivider();

    // Render other categories
    allCategory.forEach((cat) => {
        if (subscribe.hasOwnProperty(cat)) return;
        appendCategoryDiv(cat);
    });

    // Add divider between unsubscribe and update button
    createDivider();

    //TODO: update subscription button
    const updateSubscribeBtn = document.createElement('div');
    updateSubscribeBtn.id = 'update-subscribe-btn';
    updateSubscribeBtn.innerText = '更新訂閱';
    categoryContainer.appendChild(updateSubscribeBtn);

    // TODO: ---------- EVENTLISTENR ----------

    //TODO: subscribe btn event listener
    document.querySelectorAll('.subscribe-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetCategory = btn.parentElement;
            targetCategory.classList.add('subscribe');
            targetCategory.remove();
            categoryContainer.insertBefore(targetCategory, categoryContainer.querySelector('.category-divider'));
        });
    });

    //TODO: unsubscribe category if weight is 0
    document.querySelectorAll('.category-weight').forEach((weightInput) => {
        weightInput.addEventListener('blur', () => {
            if (weightInput.value == 0) {
                const targetCategory = weightInput.parentElement;
                targetCategory.classList.remove('subscribe');
                targetCategory.remove();
                categoryContainer.insertBefore(targetCategory, categoryContainer.querySelector('.category-divider').nextElementSibling);
            }
        });
    });

    //TODO: updateCategory btn click event listener
    updateSubscribeBtn.addEventListener('click', async () => {
        const newSubscribeCategories = categoryContainer.querySelectorAll('.category.subscribe');
        const data = {};

        newSubscribeCategories.forEach((catDiv) => {
            const { category } = catDiv.dataset;
            const weight = catDiv.querySelector('.category-weight').value;
            data[category] = weight;
        });

        const { data: updateResult, error, status } = await updateSubscribeAPI(token, data);
        if (error) {
            console.error(status);
            console.error(error);
            alert('系統異常: updateSubscribeAPI');
            return;
        }

        alert('訂閱成功!');
        renderSubscribe(updateResult);
    });
}

//TODO: init profile render
async function init() {
    const auth = await authenticate();

    if (!auth) {
        alert('請先登入');
        window.location.href = 'login.html';
    }

    await renderHeader(auth);

    // nullify the profile button action
    document.getElementById('action-profile').href = '#';

    //TODO: render each info display
    const { data: profile, error, status } = await getUserProfileAPI(token);

    renderFavorite(profile.favorite);

    renderSubscribe(profile.subscribe);
    console.log(profile);

    if (error) {
        console.error(status);
        console.error(error);
        alert('系統異常: getUserProfileAPI');
    }
}

init();

//TODO: navbar select event listener
document.querySelector('#navbar').addEventListener('click', (e) => {
    const selectedItem = e.target;
    if (selectedItem.matches('.navbar-item')) {
        // hide original display
        const currSelected = document.querySelector('.navbar-item.selected');
        document.getElementById(`${currSelected.id}-page`).classList.add('hide');
        currSelected.classList.remove('selected');

        // show selected display
        document.getElementById(`${selectedItem.id}-page`).classList.remove('hide');
        selectedItem.classList.add('selected');
    }
});
