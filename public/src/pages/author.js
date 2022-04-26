async function init() {
    const auth = await authenticate();
    await renderHeader(auth);
}

init();
