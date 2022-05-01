const token = localStorage.getItem('ReaderLandToken');
let user;

async function authenticate() {
    if (!token) {
        return false;
    }

    const res = await fetch('/api/user/info', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (res.status === 200) {
        user = (await res.json()).data;
        return true;
    } else {
        // token fail, remove token
        localStorage.removeItem('ReaderLandToken');
        return false;
    }
}

async function renderHeader(auth) {
    let rightElementHTML;

    if (auth) {
        // const auth = await authenticate();
        rightElementHTML = `
<a id="create-article" href="/edit.html">
    <span>建立貼文</span>
</a>
<i id="notification" class="fas fa-bell">
    <div id="notification-container">

        <div class="notification">
            <div class='notification-icon'>
                <i class="fas fa-thumbs-up"></i>
            </div> 
            <div class="notification-content">
                <span class="notification-subject">魚骨書籤</span>
                追蹤了你。
            </div>
            <span class="notification-time">一天前</span>
        </div>

            <div class="divider"></div>

        <div class="notification">
            <div class='notification-icon'>
                <i class="fas fa-comment"></i>
            </div> 
            <div class="notification-content">
                <span class="notification-subject">魚骨書籤</span>
                回復了你的文章。
            </div>
            <span class="notification-time">2022-02-15</span>
        </div>

            <div class="divider"></div>

        <div class="notification">
            <div class='notification-icon'>
                <i class="fas fa-comments"></i>
            </div> 
            <div class="notification-content">
                <span class="notification-subject">魚骨書籤</span>
                回復了你在'文章'的留言。
            </div> 
        </div>

            <div class="divider"></div>

        <div class="notification">
            <div class='notification-icon'>
                <i class="fas fa-file-alt"></i>
            </div> 
            <div class="notification-content">
                你追蹤的作者    
                <span class="notification-subject">魚骨書籤</span>
                發表了新文章，快去看看吧！
            </div>
            <span class="notification-time">2022-02-15</span>
        </div>

       

    </div>
</i>
<div id="user-avatar">
    <img id="avatar" src="${user.picture}" alt="user avatar" />
    
    <div id="user-actions" data-status="hide" class="hide">
        <a href="/profile.html" class="action" id="action-profile">
            <span id="profile">${user.name}<span>
        </a>
        <div class="divider"></div>
        <div class='action' id="action-signout">
            <span>Sign Out</span>
        </div>
    </div>

</div>
        `;
    } else {
        rightElementHTML = `
<a href="/login.html" id="login-btn">登入</a>
        `;
    }

    document.querySelector('header').innerHTML = `
<div id="header-left">
    <i id="book-icon" class="fas fa-book-open"></i>
    <span>ReaderLand</span>
</div>
<div id="header-right">
    ${rightElementHTML}
</div>
    `;

    document.querySelector('#header-left').addEventListener('click', () => {
        window.location.href = '/index.html';
    });

    if (auth) {
        document.getElementById('user-avatar').addEventListener('click', () => {
            const userActions = document.getElementById('user-actions');
            switch (userActions.dataset.status) {
                case 'hide':
                    userActions.classList.remove('hide');
                    userActions.dataset.status = 'show';
                    break;
                case 'show':
                    userActions.classList.add('hide');
                    userActions.dataset.status = 'hide';
            }
        });

        document.getElementById('action-signout').addEventListener('click', () => {
            localStorage.removeItem('ReaderLandToken');
            alert('已成功登出 🚪');
            window.location.href = '/index.html';
        });
    }
}
