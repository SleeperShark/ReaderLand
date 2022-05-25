# [ReaderLand](https://headache.services/)

An article-based social platform for creative writers and inquisitive readers.

## Registration

![Email Validation](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/Email_Validation.jpg)

After submitting the sign up form, user's will reveive an validation mail titled "ReaderLand 信箱驗證".
Click the link in the mail context to finish the registration validation, then start your journey of knowledge in the ReaderLand!

Please note that the unvalidated account will be remove 10 minutes after registration, and user can't register with email already been registered and validated before in ReaderLand.

## Index Page

![Index Page](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/index_page.jpg)

Readers can leisurely skim through aritcles newsfeeds displayed by time-series, categories, or customized newsfeed.
Board on the left side lists subscritions and weights of the categories for the articles, user can adjust it in their own profile page.

In each article card, user can scan the summary of the article. Click the title to enjoy whole article, or save it to your favorite list by clicking book mark icon on the top-right corner.
Hover on the author's avatar to see author's short introduction. Click the avatar to see the author's page and start to follow him by hit the follow button.

More Article cards will be rendered at the bottom when scrolling down the page, or reload the newsfeed by clicking refresh button on the right side of each tab.

## Article Page

![Article Page](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/article_page.jpg)

In addition to just reading article, readers can hit the like button, save it to their favorite list, share the article with the link copy button, and participate in real-time discussion on the comment board with author and other readers.

Author will receive notification when readers like the article or leave a comment, and readers will be notified if the author replies their comments as well.

## Editing Page

![Editing Page](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/editing_page.jpg)

ReaderLand provides a concise interface and fluent user experice that help writer concentrate on the content production.

When editing, writers can output their ideas efficiently and effortlessly without moving their hand away from the keyboard: you can move the cusor among paragraphs with page-up and page-down keys, insert new paragraph right below the current one with enter, and remove the paragrapg with backspace if it's empty.

Linked-list structured paragraphs allows accurate auto-saving for every updated contents, users can reload the draft and resume their works without the concern of losing progress.

## Profile Page

![Profile Page](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/profile_page.jpg)

In profile page, user can edit their avatar, username, introduction, manage favorited articles, draft, published articles, and check the followrs and fans as well.

ReaderLand features user-defined newsfeed algorithm, which release readers from the black box algorithm tyranny.
In subscription tab, readers can subscribe cateogories interest them and adjust the weight of each category. Server will then filter and sort articles by the subscription and author they follow, generating their personalized newsfeed contents on the index page.

To see detailed explanations on the newsfeed algorithm, please check following section.

# EdgeRank Algorithm

**EdgeRank** = **Content Weight** x **Edge Weight** / **Time Decay**

**Content Weight:**
A score defined by user's own subscription.

Every article starts with value 1 in weight. If article's categories match those subscribed by user, add up the weight that user set for the category.
W
if the author of the article is one the user's followers, multiply the weight value by **3**.

---

**Edge Weight:**
The reaction score of the article from reders, including number of read count, likes and comments.

Edge weight = **READ_WEIGHT^( READ_COUNT / 20 )** X **LIKE_WEIGHT^( LIKE_COUNT / 10 )** X **COMMENT_WEIGHT^( COMMENT_COUNT / 5 )**

---

**Time Decay:**
As an article gets older, it starts to lose importance.
