async function init() {
    const auth = await authenticate();

    if (!auth) {
        window.location.href = 'index.html';
    }

    await renderHeader(auth);
}

init();
