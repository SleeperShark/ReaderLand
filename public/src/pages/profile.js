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

async function init() {
    const auth = await authenticate();

    if (!auth) {
        alert('請先登入');
        window.location.href = 'login.html';
    }

    await renderHeader(auth);

    //TODO: render each info display
    const { data: profile, error, status } = await getUserProfileAPI(token);

    renderFavorite(profile.favorite);

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
