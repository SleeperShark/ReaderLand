# ReaderLand

# EdgeRank Algorithm

**EdgeRank** = **Content Weight** x **Edge Weight** / **Time Decay**

**Content Weight:**
A score defined by user's own subscription.

Every article starts with value 1 in weight. If article's categories match those subscribed by user, add up the weight that user set for the category.

if the author of the article is one the user's followers, multiply the weight value by **3**.

---

**Edge Weight:**
The reaction score of the article from reders, including number of read count, likes and comments.

Edge weight = **READ_WEIGHT^( READ_COUNT / 20 )** X **LIKE_WEIGHT^( LIKE_COUNT / 10 )** X **COMMENT_WEIGHT^( COMMENT_COUNT / 5 )**

---

**Time Decay:**
As an article gets older, it starts to lose importance.
