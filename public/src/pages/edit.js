let articleInfo;
let draftId = new URL(window.location).searchParams.get('draftId');

function appendNewparagraph(paragraphTimetamp) {
    const currArea = document.getElementById(paragraphTimetamp);

    const prevParagraph = currArea.parentElement;
    const newParagraph = document.createElement('div');

    newParagraph.classList.add('paragraph');
    newParagraph.dataset.timestamp = new Date().getTime();
    newParagraph.dataset.type = 'text';

    // Text area attibute setting
    const newArea = document.createElement('textarea');
    newArea.id = newParagraph.dataset.timestamp;
    newArea.classList.add('text-input');
    newArea.placeholder = '在這裡編輯...';

    newParagraph.appendChild(newArea);
    const container = currArea.parentElement.parentElement;
    container.insertBefore(newParagraph, currArea.parentElement.nextSibling);

    addTextAreaProperty(newParagraph.dataset.timestamp);

    //TODO: setting next attribute for previous textArea
    if (!prevParagraph.dataset.next) {
        // append case
        prevParagraph.dataset.next = newParagraph.dataset.timestamp;
    } else {
        // insert case
        const temp = prevParagraph.dataset.next;
        prevParagraph.dataset.next = newParagraph.dataset.timestamp;
        newParagraph.dataset.next = temp;
    }

    newArea.focus();
}

function removeEmptyParagraph(paragraphTimetamp) {
    const currParagraph = document.getElementById(paragraphTimetamp).parentElement;
    const nextParagraph = currParagraph.nextElementSibling;
    const prevParagraph = currParagraph.previousElementSibling;

    if (!nextParagraph) {
        prevParagraph.dataset.next = undefined;
        currParagraph.remove();
    } else {
        prevParagraph.dataset.next = nextParagraph.dataset.timestamp;
        currParagraph.remove();
    }

    prevParagraph.querySelector('textarea').focus();
}

function addTextAreaProperty(paragraphTimetamp) {
    const textarea = $(`#${paragraphTimetamp}`);

    textarea
        .css({
            height: this.scrollHeight,
            'overflow-y': 'hidden',
        })
        .on('input', function () {
            if (this.id != 'preview-input') {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            }
        })
        .keypress(function (event) {
            if (event.which == 13 && !event.shiftKey) {
                event.preventDefault();

                if (this.value.trim().length == 0) {
                    return;
                }
                appendNewparagraph(paragraphTimetamp);
            }
        });

    //TODO: except for first paragraph, add remove event when backspace empty paragraph
    if (paragraphTimetamp != document.getElementsByTagName('textarea')[0].id) {
        textarea.keydown(function (event) {
            if (event.which == 8 && this.value.length == 0) {
                event.preventDefault();
                removeEmptyParagraph(paragraphTimetamp);
            }
        });
    }
}

async function renderCategoriesSelection() {
    const { data: categories } = await getCategoriesAPI();
    const selectedPool = document.getElementById('selected-pool');
    const categoryPool = document.getElementById('category-pool');

    for (let category of categories) {
        const template = document.createElement('div');
        template.classList.add('category');
        template.innerHTML += category;

        // seleted button
        const toggleBtn = document.createElement('div');
        toggleBtn.classList.add('toggle-category-btn');
        toggleBtn.innerHTML = '<span>+<span>';
        template.appendChild(toggleBtn);

        // toggle event listener
        toggleBtn.addEventListener('click', () => {
            if (!template.classList.contains('selected')) {
                // category pool => seleted pool
                // count if already have 3 category
                if (selectedPool.querySelectorAll('.category').length == 3) {
                    return;
                }
                template.remove();
                toggleBtn.querySelector('span').innerText = '-';
                selectedPool.appendChild(template);
            } else {
                // seleted pool => category pool
                template.remove();
                toggleBtn.querySelector('span').innerText = '+';
                categoryPool.appendChild(template);
            }

            template.classList.toggle('selected');
        });

        categoryPool.appendChild(template);
    }
}

async function createDraft(token, initTimeStamp) {
    const { data: draftId, error, status } = await createDraftAPI(token, initTimeStamp);
    if (error) {
        console.error(status);
        console.error(error);
        alert('Error: createDraftAPI');
    }

    return draftId;
}

async function init() {
    const auth = await authenticate();
    await renderHeader(auth);
    await renderCategoriesSelection();
    //TODO: change create article button text
    const submitArticle = document.getElementById('create-article');
    submitArticle.querySelector('span').innerText = '準備發佈';
    submitArticle.href = '#';

    const headParagraph = document.querySelector('.paragraph');
    //TODO: set defaultInput div timeStamp
    // const headTimeStamp =
    headParagraph.dataset.timestamp = new Date().getTime();
    headParagraph.dataset.type = 'text';

    //TODO: init first paragraph
    const defaultInput = document.querySelector('.text-input');
    defaultInput.id = headParagraph.dataset.timestamp;
    addTextAreaProperty(headParagraph.dataset.timestamp);

    //TODO: create draft object
    if (!draftId) {
        draftId = await createDraft(token, headParagraph.dataset.timestamp);
        if (history.pushState) {
            var newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + `?draftId=${draftId}`;
            window.history.pushState({ path: newurl }, '', newurl);
        }
    }

    //TODO: title enter to focus to first paragraph
    document.getElementById('title-input').addEventListener('keypress', (e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();

            if (e.target.value.trim().length == 0) {
                return;
            }

            document.querySelector('.text-input').focus();
        }
    });

    //TODO: create-article btn event listener
    document.getElementById('create-article').addEventListener('click', (e) => {
        e.preventDefault();

        // Getting title
        const title = document.getElementById('title-input').value;
        if (!title) {
            alert('請輸入文章標題');
            return;
        }

        //TODO: collect paragraph context
        const context = {};
        const paragraphs = document.querySelectorAll('.paragraph');
        let preview;
        let prevTimestamp;
        paragraphs.forEach((paragraph, idx) => {
            const {
                dataset: { type, timestamp },
            } = paragraph;

            let content;

            switch (type) {
                case 'text':
                    const textInput = paragraph.querySelector('.text-input');
                    content = textInput.value;
                    if (content && !preview) {
                        preview = content.slice(0, 151);
                    }
            }

            if (!content) return;

            if (prevTimestamp) {
                context[prevTimestamp].next = timestamp;
            }

            if (!context.head) {
                // setting head node
                context.head = {
                    type,
                    content,
                };
                prevTimestamp = 'head';
            } else {
                context[timestamp] = {
                    type,
                    content,
                };
                prevTimestamp = timestamp;
            }
        });

        // Store the info in the global vairable
        articleInfo = {
            preview,
            context,
            title,
        };

        console.log(articleInfo);
        document.getElementById('submit-board').classList.remove('hide');
    });

    //TODO: counting words in preview board
    const previewInput = document.getElementById('preview-input');
    const previewCounting = document.getElementById('preview-counting');
    previewInput.addEventListener('input', () => {
        const wordsCount = previewInput.value.length;
        if (wordsCount > 150) {
            previewCounting.innerText = `超過字數限制(${wordsCount} 字)`;
            previewCounting.classList.add('preview-limit-warning');
        } else {
            previewCounting.innerText = `共 ${wordsCount} 字`;
            previewCounting.classList.remove('preview-limit-warning');
        }
    });

    //TODO: close board btn
    const submitBoard = document.getElementById('submit-board');
    const closeSubmitBoardBtn = document.getElementById('close-submit-board-btn');
    closeSubmitBoardBtn.addEventListener('click', () => {
        submitBoard.classList.toggle('hide');
    });

    //TODO: submit article btn listener
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.addEventListener('click', async () => {
        // collect category
        let categories = document.querySelectorAll('.category.selected');
        if (!categories.length) {
            alert('請至少選擇一樣主題標籤');
            return;
        }
        articleInfo.category = [];

        categories.forEach((elem) => {
            articleInfo.category.push(elem.innerText.split('\n')[0]);
        });

        // collect preview
        const preview = document.getElementById('preview-input').value;
        if (preview) {
            articleInfo.preview = preview;
        }

        articleInfo.userToken = token;

        //TODO: fetch POST article
        const { data: articleId, status, error } = await postArticleAPI(articleInfo);

        if (error) {
            console.error(status);
            console.error(error);
            alert('系統異常: POST /api/articles');
            return;
        }

        alert(`新增成功，文章id: ${articleId}`);
        window.location.href = `/article.html?id=${articleId}`;
    });
}

init();

// close comment board when press esc
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        document.getElementById('submit-board').classList.add('hide');
    }
});
