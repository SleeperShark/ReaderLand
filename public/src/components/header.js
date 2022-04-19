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
<a id="create-article" href="#">
    <span>建立貼文</span>
</a>
<i id="notification" class="fas fa-bell"></i>
<img id="user-avatar" src="${user.picture}" alt="user avatar" />
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
}
