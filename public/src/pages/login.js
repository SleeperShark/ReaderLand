async function main() {
    const auth = await authenticate();

    if (auth) {
        window.location.href = '/profile.html';
        return;
    }

    await renderHeader();
    document.getElementById('login-btn').href = '#email-input';
}

main();

//TODO: Switch between signin and signup form
const nameContainer = document.getElementById('name');
const repeatPasswordContainer = document.getElementById('repeat-password');
const submitBtn = document.getElementById('submit-btn');
const switchBtn = document.getElementById('switch');
switchBtn.addEventListener('click', (event) => {
    switch (switchBtn.dataset.state) {
        case 'sign-in':
            nameContainer.classList.remove('hide');
            repeatPasswordContainer.classList.remove('hide');
            switchBtn.innerText = '已是會員?';
            switchBtn.dataset.state = 'sign-up';
            submitBtn.innerText = '註冊';
            break;
        case 'sign-up':
            nameContainer.classList.add('hide');
            repeatPasswordContainer.classList.add('hide');
            switchBtn.innerText = '尚未註冊?';
            switchBtn.dataset.state = 'sign-in';
            submitBtn.innerText = '登入';
    }
});

document.querySelectorAll('input').forEach((elem) => {
    elem.addEventListener('blur', (event) => {
        const field = elem.previousSibling.previousSibling;
        field.style.color = 'rgba(0,0,0,0.5)';
        field.style.fontWeight = 'normal';
    });
    elem.addEventListener('focus', (event) => {
        const field = elem.previousSibling.previousSibling;
        field.style.color = 'rgba(0,0,0,1)';
        field.style.fontWeight = 'bolder';
    });
});

//TODO: collect form data for signin/signup
submitBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;

    if (!email || !password) {
        alert('請完整填寫欄位!');
        return;
    }

    const body = { email, password };
    let res;
    switch (switchBtn.dataset.state) {
        case 'sign-in':
            body.provider = 'native';
            res = await fetch('/api/user/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'Application/json',
                },
                body: JSON.stringify(body),
            });
            if (res.status == 200) {
                res = await res.json();
                const {
                    accessToken,
                    user: { name },
                } = res.data;
                localStorage.setItem('ReaderLandToken', accessToken);
                alert(`${name}, 歡迎回來❤️!`);
                window.location.href = '/index.html';
            } else {
                alert('登入資訊有誤，請再試一次。');
            }
            break;

        case 'sign-up':
            const name = document.getElementById('name-input').value;
            const repeatPW = document.getElementById('repeat-password-input').value;
            //verify repeat password
            if (password !== repeatPW) {
                alert('重複密碼不符，請再試一次');
                return;
            }

            body.name = name;
            res = await fetch('/api/user/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'Application/json',
                },
                body: JSON.stringify(body),
            });
            if (res.status == 200) {
                res = await res.json();
                console.log(res.data);

                const {
                    accessToken,
                    user: { name },
                } = res.data;
                localStorage.setItem('ReaderLandToken', accessToken);
                alert(`${name}, 歡迎來到 ReaderLand ❤️`);
                window.location.href = '/index.html';
                return;
            } else if (res.status == 400) {
                alert('✘ 信箱格式不符。');
                return;
            } else if (res.status == 403) {
                alert('✘ 此信箱已註冊。');
                return;
            } else {
                alert('✘ 系統異常，請稍後再試。');
            }
    }
});
