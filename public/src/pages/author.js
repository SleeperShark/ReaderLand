const authorId = new URL(window.location).searchParams.get('id');

async function init() {
    const auth = await authenticate();
    await renderHeader(auth);
    const { data: authorProfile, error, status } = await getAuthorProfileAPI(authorId);
    if (error) {
        console.error(status);
        console.error(error);
        alert('系統異常: getAuthorProfileAPI');
    } else {
        console.log(authorProfile);
    }
}

init();
