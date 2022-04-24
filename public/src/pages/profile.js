async function init() {
    const auth = await authenticate();

    if (!auth) {
        alert('請先登入');
        window.location.href = 'login.html';
    }

    await renderHeader(auth);
}

init();
