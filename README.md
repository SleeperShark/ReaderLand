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

![Index Page](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/article_page.jpg)

In addition to just reading article, readers can hit the like button, save it to their favorite list, share the article with the link copy button, and participate in real-time discussion with author and other readers.

## Editing Page

## Profile Page

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
