const authorId = new URL(window.location).searchParams.get('id');

// TODO: render author's info
function renderAuthorInfo(auth, authorProfile) {
    // bordertop random color
    document.getElementById('author-info').style.borderTop = `100px solid rgb( ${Math.random() * 256}, ${Math.random() * 256}, ${Math.random() * 256})`;
    // avatar
    document.getElementById('author-avatar').src = authorProfile.picture;
    // name
    document.getElementById('author-name').innerText = authorProfile.name;
    // bio
    document.getElementById('author-bio').innerText = authorProfile.bio;
    // article count
    document.getElementById('articles-count').innerText = authorProfile.articles?.length || 0;
    // follower count
    document.getElementById('follower-count').innerText = authorProfile.follower?.length || 0;
    // followee count
    document.getElementById('followee-count').innerText = authorProfile.followee?.length || 0;

    // follow btn
    const followBtn = document.getElementById('follow-btn');
    if (!auth || authorProfile._id.toString() == user.userId.toString()) {
        followBtn.remove();
        return;
    }

    for (let followee of authorProfile.followee) {
        if (followee.toString() == user.userId.toString()) {
            followBtn.classList.add('followed');
            break;
        }
    }

    // follow btn event listener
    followBtn.addEventListener('click', async () => {
        if (followBtn.classList.contains('followed')) {
            // unfollow author
            const { error, status } = await unFollowAuthorAPI(token, authorProfile._id);
            if (error) {
                console.error(status);
                console.error(error);
                await toastBaker({ icon: 'error', text: '系統異常，請稍後再試' });
                return;
            }
            followBtn.classList.remove('followed');
        } else {
            // follow author
            const { error, status } = await followAuthorAPI(token, authorProfile._id);
            if (error) {
                console.error(status);
                console.error(error);
                await toastBaker({ icon: 'error', text: '系統異常，請稍後再試' });
                return;
            }
            followBtn.classList.add('followed');
        }
    });
}

function renderArticles(articles) {
    const articlesContainer = document.getElementById('author-articles');

    articles.forEach(({ category, commentCount, readCount, likeCount, preview, title, _id, createdAt }) => {
        const articleDiv = document.createElement('div');
        articleDiv.classList.add('article');
        articleDiv.onclick = () => {
            window.open(`article.html?id=${_id}`, '_blank').focus();
        };

        const categoryHTML = category.reduce((prev, cat) => (prev += `<span class="category">${cat}</span>`), '');

        articleDiv.innerHTML = `
<div class="article-title">${title}</div>
<div class="article-categories">
    ${categoryHTML}
</div>
<div class="article-preview">${preview}</div>
<div class="article-footer">
    <div class="article-date">${timeTransformer(createdAt)}</div>
    <div class="article-feedback">
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
        `;

        articlesContainer.appendChild(articleDiv);
    });
}

async function init() {
    document.querySelector('main').style.display = 'none';

    const auth = await authenticate();
    await renderHeader(auth);
    const { data: authorProfile, error, status } = await getAuthorProfileAPI(authorId);

    if (status == 400) {
        window.location.href = '/404.html';
        return;
    }

    if (error) {
        console.error(status);
        console.error(error);
        await toastBaker({ icon: 'error', text: '系統異常，請稍後再試' });
        return;
    }

    // render author info
    renderAuthorInfo(auth, authorProfile);
    renderArticles(authorProfile.articles);

    document.querySelector('.lds-ripple').style.display = 'none';
    document.querySelector('main').style.display = 'block';
}

init();
