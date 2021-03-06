/* eslint-disable no-undef */
let allCategory;
const directTo = new URL(window.location).searchParams.get('to');

function randomColor() {
    return `rgb(${Math.random() * 256}, ${Math.random() * 256}, ${Math.random() * 256})`;
}

async function renderDrafts() {
    const { data: drafts, error, status } = await getDraftsListAPI(token);
    if (error) {
        console.error(status);
        console.error(error);
        await toastBaker({ text: '載入草稿失敗，請稍後再試。', icon: 'error' });
        return;
    }

    drafts.sort((a, b) => new Date(b.lastUpdatedAt) - new Date(a.lastUpdatedAt));

    const draftContainer = document.getElementById('draft-container');
    for (let draft of drafts) {
        const { title, _id, createdAt, lastUpdatedAt } = draft;
        const draftDiv = document.createElement('div');
        draftDiv.classList.add('draft');

        draftDiv.innerHTML = `
<i class="fas fa-edit draft-edit"></i>
<i class="fas fa-trash-alt draft-discard"></i>
<div class="draft-title">${title == '' ? '無標題' : title}</div>
<div class="draft-date createdAt">建立日期: ${timeTransformer(createdAt)}</div>
<div class="draft-date LastUpdatedAt">上次更新: ${timeTransformer(lastUpdatedAt)}</div>`;
        draftContainer.appendChild(draftDiv);

        draftDiv.getElementsByClassName('draft-edit')[0].addEventListener('click', () => {
            window.location.href = `/edit.html?draftId=${_id}`;
        });

        draftDiv.getElementsByClassName('draft-title')[0].addEventListener('click', () => {
            window.location.href = `/edit.html?draftId=${_id}`;
        });

        draftDiv.getElementsByClassName('draft-discard')[0].addEventListener('click', async () => {
            const { error, status } = await deleteDraftAPI(token, _id);

            if (error) {
                console.error(status);
                console.error(error);
                await toastBaker({ icon: 'error', text: '移除草稿失敗，請稍後再試。' });
                return;
            }

            draftDiv.remove();
        });
    }
}

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
                    <img class='favorite-artilce-author' src="${author.picture}" alt="" />
                    <div class="name-date">
                        <a href="/author.html?id=${author._id}" class="author-name">${author.name}</a>
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

        // Redirect to author.html when click author avatar
        articleDiv.querySelector('.favorite-artilce-author').addEventListener('click', () => {
            window.location.href = `/author.html?id=${author._id}`;
        });

        //TODO: unfavortie enevt
        articleDiv.querySelector('i.fa-bookmark').addEventListener('click', async (e) => {
            const articleId = e.target.dataset.id;
            const { error, status } = await unFavoriteArticleAPI(token, articleId);
            if (error) {
                console.error(status);
                console.error(error);
                await toastBaker({ icon: 'error', text: '移除珍藏失敗，請稍後再試。' });
                return;
            }
            await toastBaker({ icon: 'success', text: '成功移除珍藏' });
            e.target.parentElement.remove();
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

    //TODO: Case: no single subscription
    if (!subscribe) {
        createDivider();
        allCategory.forEach((cat) => {
            appendCategoryDiv(cat);
        });
    } else {
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
            if (Object.keys(subscribe).includes(cat)) return;
            appendCategoryDiv(cat);
        });
    }

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

            const weightInput = targetCategory.querySelector('.category-weight');
            weightInput.innerText = 1;
            weightInput.value = 1;
        });
    });

    document.querySelectorAll('.category-weight').forEach((weightInput) => {
        weightInput.addEventListener('blur', async () => {
            // if value out of range -> alert and set back to 1
            if (weightInput.value > 10 || weightInput.value < 0) {
                await toastBaker({ icon: 'warning', text: '主題權重只能是 0-10 之間的整數歐!先幫你重設為1 😎' });
                weightInput.value = 1;
                weightInput.innerText = 1;
                return;
            }
            //TODO: unsubscribe category if weight is 0
            if (weightInput.value == 0) {
                const targetCategory = weightInput.parentElement;
                targetCategory.classList.remove('subscribe');
                targetCategory.remove();
                categoryContainer.insertBefore(targetCategory, categoryContainer.querySelector('.category-divider').nextElementSibling);
                return;
            }
        });

        weightInput.addEventListener('keypress', (e) => {
            if (e.key == 'Enter') {
                weightInput.blur();
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
            await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
            return;
        }
        await toastBaker({ icon: 'success', text: '訂閱成功!' });
        renderSubscribe(updateResult);
    });
}

function renderFollowee(followee) {
    const followeePage = document.getElementById('followee-page');

    followee.forEach((elem) => {
        const followeeDiv = document.createElement('div');
        followeeDiv.classList.add('followee');
        followeeDiv.dataset.id = elem._id;
        followeeDiv.style.borderLeft = `90px solid ${randomColor()}`;
        followeeDiv.innerHTML += `
    <img src="${elem.picture}" alt="" />
    <span>${elem.name}</span>`;

        followeeDiv.addEventListener('click', () => {
            window.open(`/author.html?id=${elem._id}`, '_blank').focus();
        });
        followeePage.appendChild(followeeDiv);
    });
}

function renderFollower(follower) {
    const followerPage = document.getElementById('follower-page');

    follower.forEach((elem) => {
        const followerDiv = document.createElement('div');
        followerDiv.dataset.id = elem._id;
        followerDiv.classList.add('follower');
        followerDiv.style.borderTop = `50px solid ${randomColor()}`;
        followerDiv.innerHTML += `
    <img class="follower-avatar" src="${elem.picture}" onclick="window.open('/author.html?id=${elem._id}', '_blank').focus();" alt="" />
    <div class="follower-name" onclick="window.open('/author.html?id=${elem._id}', '_blank').focus();">${elem.name}</div>
    <div class="follower-bio">
        ${elem.bio}
    </div>
    <i class="fas fa-ban unfollow-btn">&nbsp;&nbsp;取消追蹤</i>
        `;
        followerPage.appendChild(followerDiv);
    });

    followerPage.querySelectorAll('.unfollow-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const { error, status } = await unFollowAuthorAPI(token, btn.parentElement.dataset.id);

            if (error) {
                console.error(status);
                console.error(error);
                await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
                return;
            }

            await toastBaker({ icon: 'success', text: `取消追蹤 ${btn.parentElement.querySelector('.follower-name').innerText}` });
            btn.parentElement.remove();
        });
    });
}

function renderProfile({ name, picture, bio }) {
    document.getElementById('profile-avatar').src = picture;
    document.querySelector('#profile-name > div').textContent = name;
    document.querySelector('#bio').textContent = bio;
}

function renderPublishedArticles(articles) {
    const container = document.getElementById('published-container');

    articles.forEach(({ _id, title, createdAt, readCount, category, likeCount, commentCount }) => {
        const articleDiv = document.createElement('div');
        articleDiv.classList.add('published-article');
        const categoriesHTML = category.reduce(
            (prev, elem) =>
                (prev += `
<span class="published-category">${elem}</span>
        `),
            ''
        );

        articleDiv.innerHTML = `
<i class="fas fa-edit published-edit"></i>
<span class="published-edit-hint">編輯文章</span>

<div class="published-title" onclick="window.location.href='/article.html?id=${_id}'">${title}</div>
<div class="published-category-container">
    ${categoriesHTML}
</div>

<div class="published-footer">
    <div class="published-date">${timeTransformer(createdAt)}</div>
    <div class="published-feedback">
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
</div>`;

        container.appendChild(articleDiv);
    });
}

//TODO: init profile render
async function init() {
    document.querySelector('main').style.display = 'none';

    const auth = await authenticate();

    if (!auth) {
        await toastBaker({ icon: 'warning', text: '請先登入!' });
        window.location.href = 'login.html';
    }

    await renderHeader(auth);

    // nullify the profile button action
    document.getElementById('action-profile').href = '#';

    //TODO: render each info display
    const { data: profile, error, status } = await getUserProfileAPI(token);

    if (error) {
        console.error(status);
        console.error(error);
        await toastBaker({ icon: 'error', text: '載入個人頁面失敗，請稍後再試' });
        return;
    }

    renderFavorite(profile.favorite);

    renderSubscribe(profile.subscribe);

    renderFollowee(profile.followee);

    renderFollower(profile.follower);

    renderProfile({ picture: profile.picture, name: profile.name, bio: profile.bio });

    renderPublishedArticles(profile.publishedArticles);

    //TODO: render draft list
    await renderDrafts();
    document.body.style.display = 'block';
    if (directTo) {
        document.getElementById(directTo).click();
    }

    document.querySelector('.lds-ripple').style.display = 'none';
    document.querySelector('main').style.display = 'flex';
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

//TODO: edit name
let EditNameProcessing = false;
async function EditNameEvent() {
    if (EditNameProcessing) return;
    EditNameProcessing = true;
    nameDiv.style.display = 'block';
    nameEditIcon.style.display = 'block';
    nameInput.style.display = 'none';

    if (nameDiv.innerText == nameInput.value) {
        // no edit => return back
        EditNameProcessing = false;
        return;
    }

    // send POST API to update name
    const { data: user, error, status } = await updateUserProfileAPI(token, { name: nameInput.value });

    if (error) {
        console.error(status);
        console.error(error);
        await toastBaker({ icon: 'error', text: '更新失敗，請稍後再試。' });
        return;
    }

    nameDiv.style.display = 'block';
    nameEditIcon.style.display = 'block';
    nameInput.style.display = 'none';
    nameDiv.innerText = nameInput.value;
    EditNameProcessing = false;

    window.localStorage.setItem('ReaderLandToken', user.accessToken);
    document.getElementById('profile').innerText = user.name;
}

const nameDiv = document.querySelector('#profile-name > div');
const nameInput = document.getElementById('name-input');
const nameEditIcon = document.getElementById('name-edit');

nameEditIcon.addEventListener('click', () => {
    nameDiv.style.display = 'none';
    nameEditIcon.style.display = 'none';
    nameInput.style.display = 'block';

    nameInput.value = nameDiv.innerText;
    nameInput.focus();
});

// finish Editing with blur or enter
nameInput.addEventListener('blur', EditNameEvent);
nameInput.addEventListener('keypress', (e) => {
    if (e.keyCode == 13) {
        EditNameEvent();
    }
});

//TODO: edit bio
let editBioProcessing = false;
async function EditBioEvent() {
    if (editBioProcessing) {
        return;
    }
    editBioProcessing = true;
    bioDiv.classList.remove('edit');
    bioEditIcon.style.display = 'block';
    bioDiv.contentEditable = 'false';

    if (bioVersion != bioDiv.innerText) {
        // PUT update API
        const { error, status } = await updateUserProfileAPI(token, { bio: bioDiv.innerText });

        if (error) {
            console.error(status);
            console.error(error);
            await toastBaker({ icon: 'error', text: '更新失敗，請稍後再試。' });
            return;
        }

        bioVersion = bioDiv.innerText;
    }

    editBioProcessing = false;
}

const bioDiv = document.getElementById('bio');
const bioEditIcon = document.getElementById('bio-edit');
let bioVersion;

bioEditIcon.addEventListener('click', () => {
    bioVersion = bioDiv.innerText;
    bioDiv.contentEditable = 'true';
    bioDiv.classList.add('edit');
    bioDiv.focus();
    bioEditIcon.style.display = 'none';
});

bioDiv.addEventListener('blur', EditBioEvent);
bioDiv.addEventListener('keypress', (e) => {
    if (e.keyCode == 13 && !e.shiftKey) {
        e.preventDefault();
        EditBioEvent();
    }
});

// TODO: toggle draft and published articles
const draftTag = document.getElementById('draft-tag');
const draftContainer = document.getElementById('draft-container');
const publishedTag = document.getElementById('published-tag');
const publishedContainer = document.getElementById('published-container');
draftTag.addEventListener('click', () => {
    draftTag.classList.add('selected');
    draftContainer.classList.remove('hide');
    publishedTag.classList.remove('selected');
    publishedContainer.classList.add('hide');
});

publishedTag.addEventListener('click', () => {
    publishedTag.classList.add('selected');
    publishedContainer.classList.remove('hide');
    draftTag.classList.remove('selected');
    draftContainer.classList.add('hide');
});

//TODO: show choose file when click camera icon
const changeAvatarBtn = document.getElementById('change-avatar-btn');
const fileInput = document.getElementById('change-avatar');
changeAvatarBtn.addEventListener('click', () => {
    fileInput.value = null;
    fileInput.click();
});

//TODO: upload avatar
let uploading = false;
fileInput.addEventListener('change', async () => {
    const uploadHint = document.getElementById('upload-avatar-hint');
    try {
        if (!fileInput.value) {
            return;
        }

        if (uploading) {
            await toastBaker({ icon: 'info', text: '照片上傳中，請稍後...' });
            return;
        }

        uploading = true;
        // Show upload hint
        uploadHint.innerText = '上傳中...';
        uploadHint.style.display = 'inline-block';

        var {
            data: { uploadURL, avatarName },
            error,
            status,
        } = await getUploadUrlAPI(token);

        if (error) {
            console.error(status);
            console.error(error);
            await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
            return;
        }

        let res = await fetch(uploadURL, {
            method: 'PUT',
            headers: { ContentType: 'image/jpeg	' },
            body: fileInput.files[0],
        });

        if (res.status != 200) {
            await res.json();
            await toastBaker({ icon: 'error', text: '上傳圖片失敗，請稍後再試。' });
            console.error(res);
            return;
        }

        //TODO: save new avatar image name
        var updateProfileResult = await updateUserProfileAPI(token, { picture: avatarName });
        if (updateProfileResult.error) {
            console.error(updateProfileResult.status);
            console.error(updateProfileResult.error);
            await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
            return;
        }

        const { data: user } = updateProfileResult;

        uploadHint.innerText = '上傳成功';
        setTimeout(() => {
            uploadHint.style.display = 'none';
        }, 800);

        //TODO: replace with new avatar, reset token and header profile image
        document.getElementById('profile-avatar').src = user.picture;
        localStorage.setItem('ReaderLandToken', user.accessToken);
        document.getElementById('avatar').src = user.picture;
    } catch (error) {
        console.error(error);
        await toastBaker({ icon: 'error', text: '系統異常，請稍後再試。' });
    }

    uploadHint.style.display = 'none';
    uploading = false;
});
