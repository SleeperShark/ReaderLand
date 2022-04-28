let articleInfo;
let draftId = new URL(window.location).searchParams.get('draftId');
var typingTimer;

//TODO: append next paragraph and autosaving in the new structure
async function appendNewparagraphAndSavingDraft(paragraphTimetamp, nextParagraphTimestamp = new Date().getTime(), saving = true) {
    clearTimeout(typingTimer);

    const currArea = document.getElementById(paragraphTimetamp);
    const prevParagraph = currArea.parentElement;
    const newParagraph = document.createElement('div');

    newParagraph.classList.add('paragraph');
    newParagraph.dataset.timestamp = nextParagraphTimestamp;
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

    const updateData = { $set: {} };
    updateData['$set'][`context.${paragraphTimetamp}.content`] = currArea.value;
    updateData['$set'][`context.${paragraphTimetamp}.next`] = newParagraph.dataset.timestamp;
    //TODO: setting next attribute for previous textArea && collecting update Data
    if (!prevParagraph.dataset.next) {
        // append case
        prevParagraph.dataset.next = newParagraph.dataset.timestamp;

        updateData['$set'][`context.${newParagraph.dataset.timestamp}`] = { content: '', type: 'text' };
    } else {
        // insert case
        const temp = prevParagraph.dataset.next;
        prevParagraph.dataset.next = newParagraph.dataset.timestamp;
        newParagraph.dataset.next = temp;

        updateData['$set'][`context.${newParagraph.dataset.timestamp}`] = { content: '', next: temp, type: 'text' };
    }

    newArea.focus();

    if (saving) {
        //TODO: update draft
        const { error, status } = await updateDraftAPI(token, draftId, updateData);
        if (error) {
            console.error(status);
            console.error(error);
            alert('Error: updateDraftAPI after apeending');
        }

        console.log('saving success');
    }

    return newParagraph;
}

async function removeEmptyParagraphAndSavingDraft(paragraphTimetamp) {
    const currParagraph = document.getElementById(paragraphTimetamp).parentElement;
    const nextParagraph = currParagraph.nextElementSibling;
    const prevParagraph = currParagraph.previousElementSibling;

    const updateData = { $set: {}, $unset: {} };
    updateData['$unset'][`context.${paragraphTimetamp}`] = '';
    if (!nextParagraph) {
        // remove last paragraph
        delete prevParagraph.dataset.next;
        currParagraph.remove();

        updateData['$unset'][`context.${prevParagraph.dataset.timestamp}.next`] = '';
    } else {
        prevParagraph.dataset.next = nextParagraph.dataset.timestamp;
        currParagraph.remove();

        updateData['$set'][`context.${prevParagraph.dataset.timestamp}.next`] = nextParagraph.dataset.timestamp;
    }

    prevParagraph.querySelector('textarea').focus();

    //TODO: update delete action
    const { data, error, status } = await updateDraftAPI(token, draftId, updateData);
    if (error) {
        console.error(status);
        console.error(error);
        alert('Error: update Draft after remove paragraph');
        return;
    }

    console.log('update Success');
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
        //TODO: autosaving content of the context area
        .on('keyup', function () {
            clearTimeout(typingTimer);
            typingTimer = setTimeout(async () => {
                const updateData = { $set: {} };
                updateData['$set'][`context.${paragraphTimetamp}.content`] = this.value;

                const { data, error, status } = await updateDraftAPI(token, draftId, updateData);

                if (error) {
                    console.error(status);
                    console.error(error);
                    alert('Error: Autosaving content');
                    return;
                }

                console.log('Auto saving success after keyup');
            }, 2000);
        })
        .on('keydown', function () {
            clearTimeout(typingTimer);
        })
        .keypress(function (event) {
            if (event.which == 13 && !event.shiftKey) {
                event.preventDefault();
                clearTimeout(typingTimer);

                if (this.value.trim().length == 0) {
                    return;
                }

                appendNewparagraphAndSavingDraft(paragraphTimetamp);
            }
        });

    //TODO: except for first paragraph, add remove event when backspace empty paragraph
    if (paragraphTimetamp != document.getElementsByTagName('textarea')[0].id) {
        textarea.keydown(function (event) {
            if (event.which == 8 && this.value.length == 0) {
                event.preventDefault();
                removeEmptyParagraphAndSavingDraft(paragraphTimetamp);
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

async function renderDraft({ draft: { title, head, context }, headParagraph, defaultInput, titleInput }) {
    titleInput.value = title;
    headParagraph.dataset.timestamp = head;
    defaultInput.id = head;

    // render first paragraph content
    let currtTimestamp = head;
    headParagraph.dataset.timestamp = currtTimestamp;
    headParagraph.dataset.next = context[currtTimestamp].next;
    headParagraph.dataset.type = context[currtTimestamp].type;

    defaultInput.id = currtTimestamp;
    defaultInput.value = context[currtTimestamp].content;
    addTextAreaProperty(defaultInput.id);

    // render rest of paragraph
    while (context[currtTimestamp].next != undefined && context[currtTimestamp].next != 'undefined') {
        const newTimestamp = context[currtTimestamp].next;
        const newParagraph = await appendNewparagraphAndSavingDraft(currtTimestamp, newTimestamp, false);
        const newTextInput = newParagraph.children[0];

        newParagraph.dataset.timestamp = newTimestamp;
        newParagraph.dataset.next = context[newTimestamp].next;
        newParagraph.dataset.type = context[newTimestamp].type;

        newTextInput.id = newTimestamp;
        newTextInput.value = context[newTimestamp].content;

        currtTimestamp = newTimestamp;
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
    const defaultInput = document.querySelector('.text-input');

    const titleInput = document.getElementById('title-input');
    //TODO: title enter to focus to first paragraph
    titleInput.addEventListener('keypress', (e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();

            if (e.target.value.trim().length == 0) {
                return;
            }

            document.querySelector('.text-input').focus();
        }
    });
    //TODO: save title when blur
    titleInput.addEventListener('blur', async () => {
        const { data, error, status } = await updateDraftAPI(token, draftId, { $set: { title: titleInput.value || '無標題' } });

        if (error) {
            console.error(status);
            console.error(error);
            alert('Error: updateDraftAPI');
            return;
        }

        console.log('Saving title success');
    });

    if (!draftId) {
        //TODO: init default paragraph and create draft object

        // set defaultInput div timeStamp
        headParagraph.dataset.timestamp = new Date().getTime();
        headParagraph.dataset.type = 'text';

        // init first paragraph
        defaultInput.id = headParagraph.dataset.timestamp;
        addTextAreaProperty(headParagraph.dataset.timestamp);

        draftId = await createDraft(token, headParagraph.dataset.timestamp);
        if (history.pushState) {
            var newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + `?draftId=${draftId}`;
            window.history.pushState({ path: newurl }, '', newurl);
        }
    } else {
        //TODO: render draft
        const { data: draft, error, status } = await getDraftAPI(token, draftId);

        if (error) {
            console.error(status);
            console.error(error);
            alert('Error: getDraftAPIs');
        } else {
            await renderDraft({ draft, headParagraph, defaultInput, titleInput });
        }
        defaultInput.focus();
    }

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
        let head;

        paragraphs.forEach((paragraph) => {
            console.log(paragraph);
            const {
                dataset: { type, timestamp, next },
            } = paragraph;

            let content;

            switch (type) {
                case 'text':
                    const textInput = paragraph.children[0];
                    content = textInput.value;
            }

            // reorganize the linked list relation
            if (content) {
                if (!head) {
                    head = timestamp;
                } else {
                    context[prevTimestamp].next = timestamp;
                }

                context[timestamp] = { content, type };
                prevTimestamp = timestamp;

                if (!preview) {
                    preview = content.slice(0, 150);
                }
            }
        });

        if (!Object.keys(context).length) {
            alert('請輸入內文');
            return;
        }

        // Store the info in the global vairable
        articleInfo = {
            preview,
            context,
            title,
            head,
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

        //TODO: delete draft
        const result = await deleteDraftAPI(token, draftId);
        console.log(result);

        window.location.href = `/article.html?id=${articleId}`;
    });

    $('html').scrollTop(0);
}

init();

// close comment board when press esc
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        document.getElementById('submit-board').classList.add('hide');
    }
});

// TODO: remove the draft if every is empty
window.onbeforeunload = async function () {
    if (document.getElementById('title-input').value) {
        return undefined;
    }

    const texts = document.getElementsByClassName('text-input');
    for (let textInput of texts) {
        if (textInput.value) {
            return undefined;
        }
    }

    await deleteDraftAPI(token, draftId);
    return undefined;
};
