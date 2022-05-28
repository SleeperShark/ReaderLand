# **ReaderLand**

An article-based social platform for creative writers and inquisitive readers.

## **Test Account**

Webiste URL: https://headache.services

-   Test Account

    -   Email: `author_0@ReaderLand.com`
    -   Password: `password`

    To simulate real user experience, crontab scheduler executes the [PseudoWorker.js](https://github.com/SleeperShark/ReaderLand/blob/main/util/PseudoUserWorker.js) to mimic other user interaction with the test account every minute. User will be notified of these action by the notification on the header.

<details id="table-of-content">
  <summary>Table of Conetents</summary>
  
  ### **ReaderLand Tutorial**
 
  * [Index Page](#index-page)
  * [Article Page](#article-page)
  * [Editing Page](#editing-page)
  * [Profile Page](#profile-page)
  * [Registration](#registration)
  
  ### **Website Structure**
  
  * [Architecture](#architecture)
  * [EdgeRank-like Weight Algorithm](#edgerank-like-weight-algorithm)
  * [Updates for Newsfeed after Generation](#updates-for-newsfeed-after-generation)
    * [Push Model](#push-model)
    * [Pull Model](#pull-model)
  * [Database Collection Schema](#database-collection-schema)
  
</details>

<br/>

# **ReaderLand Tutorial**

## **Index Page**

Browse through the articles derived from the personalized newsfeed algorithm.

![Index_Page](https://user-images.githubusercontent.com/88277367/170702279-13425148-f1e3-4659-ae52-ce0e8f7e4f83.gif)

Readers can leisurely skim through aritcles newsfeeds displayed by **time-series**, **categories**, or **customized newsfeed**.
Board on the left side lists subscritions and weights of the categories for the articles, user can adjust it in their own profile page.

In each article card, user can scan the summary of the article. Click the title to enjoy whole article, or save it to your favorite list by clicking book mark icon on the top-right corner.
Hover on the author's avatar to see author's brief introduction. Click the avatar to see the author's page and start to follow him by hit the follow button.

More Article cards will be rendered at the bottom when scrolling down the page, or reload the newsfeed by clicking refresh button on the right side of each tab.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>
  
## **Article Page**

Enjoy the beauty of knowledge and take part in a real-time discussion with author and other readers.

![Article_Page](https://user-images.githubusercontent.com/88277367/170703212-acb457eb-1f46-4ddc-b3c2-d331190012e2.gif)

In addition to just reading article, readers can hit the like button, save it to their favorite list, share the article with the link copy button, and participate in real-time discussion on the comment board with author and other readers.

Author will receive notification when readers like the article or leave a comment, and readers will be notified if the author replies their comments as well.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## **Editing Page**

A User-friendly editing interface featured auto-saving and intuitive operation.

![Editing_Page](https://user-images.githubusercontent.com/88277367/170697643-fc1e5660-9eb3-49af-9abe-9211eb663f5a.gif)

ReaderLand provides a concise interface and fluent user experice that help writer concentrate on the content production.

When editing, writers can output their ideas efficiently and effortlessly without moving their hand away from the keyboard: you can move the cusor among paragraphs with page-up and page-down keys, insert new paragraph right below the current one with enter, and remove the paragrapg with backspace if it's empty.

Linked-list structured paragraphs allows accurate auto-saving for every updated contents, users can reload the draft and resume their works without the concern of losing progress.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## **Profile Page**

Adjust subscription of categories and weights to design the algorithm best matching your preference.

![Profile_Page](https://user-images.githubusercontent.com/88277367/170703821-127ea44a-195a-4e76-ada0-1c268966e9a8.gif)

In profile page, users can:

-   Edit their avatar, username and introduction.
-   Manage favorited articles, draft and published articles.
-   Check the followrs and fans.
-   Adjust categories and weight they subscribed.

ReaderLand features **user-defined newsfeed algorithm**, which release readers from the black box algorithm tyranny.
In subscription tab, readers can subscribe cateogories interest them and adjust the weight of each category. Server will then filter and sort articles by the subscription and author they follow, generating their personalized newsfeed contents on the index page.

To see detailed explanations on the newsfeed algorithm, please check [EdgeRank-like Weight Algorithm](#edgerank-like-weight-algorithm) section below.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## **Registration**

![Email Validation](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/Email_Validation.jpg)

After submitting the sign up form, user's will reveive an validation mail titled "ReaderLand 信箱驗證".
Click the link in the mail context to finish the registration validation, then start your journey of knowledge in the ReaderLand!

Please note that the **unvalidated account will be remove 10 minutes after registration**, and user can't register with email already validated in ReaderLand.

**Note**: In the developemnt environemnt, crontab **refreshes the database twice a day** to keep the data size and articles status, so the registered account would be flushed as well every 12 hours.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

---

# **Website Structure**

## **Architecture**

![Archietecture](https://user-images.githubusercontent.com/88277367/170809579-0afd1eaf-bfcd-4865-aeb0-41141c077430.jpg)

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## **EdgeRank-like Weight Algorithm**

![newsfeed](https://user-images.githubusercontent.com/88277367/170694192-2e4d1a98-55a9-428b-919a-672ab39cb0d9.jpg)

In newsfeed generation, the server will filter articles written by the user's followers or categories matching one of user's subscription, then sort articles by a preference weight derived from this EdgeRank-like weight algorithm and store it in Redis.

The algorithm is composed of 3 parameters:

-   **Preference Weight = ( 1 + SUM_OF_CAT_WEIGHT ) \* ( FOLLOWER_WEIGHT )**

    Every article will start with a base weight of 1, then add the category weight derived from the user's subscription to it, and finally, multiply the total weight by follower weight if the article was written by one of the user's followers.

    For instance, if one article is categorized as "投資理財" and "職場產業" while the reader subscribes "投資理財" with the weight of 5, the preference weight of the article is 1 + 5 = 6;

    If author of the article is also followed by the user, multiply the number by FOLLOWER_WEIGHT ( 3 in current environment ) to get the final preference weight.

    FOLLOWER_WIGHT is editable in `.env`.

    ***

-   **Popularity Weight =**

     <p><strong> READ_WEIGHT<sup>(READ_COUNT / READ_DIV)</sup> * LIKE_WEIGHT<sup>(LIKE_COUNT / LIKE_DIV)</sup> * COMMENT_WEIGHT<sup>(COMMENT_COUNT / COMMENT_DIV) </sup> </strong></p>
     
     Popularity weight is the product of 3 feedback weights (views, likes, and comments) each derived from their original weight to the power of count/divisor.
     
     Original weights and count divisor for each kind of feedback can be adjusted in `.env`.

    ***

-   **Time Decayer**

    Briefly speaking, the time decay parameter raises the importance of the freshness of the articles: the more fresh the article was, the less time decayer value would be, and hence the greater the final weight article would get.

    To see detailed calculation of time decayer, check `timeDecayer` function in [util.js](https://github.com/SleeperShark/ReaderLand/blob/main/util/util.js).

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## **Updates for Newsfeed after Generation**

To update the newsfeed with articles posted after generation, instead of regenerating it, ReaderLand implements **Push-Pull model** scheduled by crontab to insert new articles into newsfeeds.

### **Push Model**

![Push_model](https://user-images.githubusercontent.com/88277367/170694598-3303b87f-f7d1-44af-98a2-ff428723a16a.jpg)

When an author publish a new article, server will retrieve the fans' id of the author and **"Push"** the article to their newsfeed array randomly.

### **Pull Model**

![Pull_model](https://user-images.githubusercontent.com/88277367/170694837-1d6d73e0-cad9-4ad1-ab9b-eced99e92db6.jpg)

Every 15 minutes, [pullWorker.js](https://github.com/SleeperShark/ReaderLand/blob/main/util/pullWorker.js) will **"Pull"** the articles that meet the user's subscription (but not written by their followers) and was published after the newsfeed was generated, then sort the articls by newsfeed algorithm.

Finally, the worker will insert these articles into the newsfeed array. Currently the ReaderLand adopts a completely random-distributed strategy for insertion, but website maitainer can switch to a more even-distributed strategy by changing the strategy code in `.env`.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## **Database Collection Schema**

### **User**

```
{
  _id: ObjectId,
  role: Number,
  valid: Boolean,
  email: String,
  password: String,
  picture: String,
  provider: String,
  follower: [ ObjectId ],
  followee: [ ObjectId ],
  subscribe: {
    "Category": Number
  },
  bio: String,
  favorite: [{ articleId: ObjectId, createdAt: ISOString }]
}
```

### **Category**

```
{
  _id: ObjectId,
  category: String,
}
```

### **Article**

```
{
  _id: ObjectId,
  title: String,
  context: {
    "ISOString": {
      content: String,
      type: String,
      nexr: ISOString
    }
  },
  preview: String,
  createdAt: ISOString,
  readCount: Number,
  likes: [ ObjectId ],
  comments: [ {
    _id: ObjectID,
    context: String,
    createdAt: ISOString,
    reader: ObjectId,
    authorReply: {
      context: String,
      createdAt: ISOString
    }
  } ],
  category: [ String ],
  head: ISOString
}
```

### **Draft**

```
{
  _id: ObjectId,
  title: String,
  author: ObjectId,
  context: {
    "ISOString": {
      type: String,
      content: String,
      next: ISOString
    }
  },
  head: ISOString,
  createdAt: ISOString,
  lastUpdatedAt: ISOString
}
```

### **Notification**

```
{
  _id: ObjectId,
  unread: Number,
  notifications: [ {
    type: String,
    createdAt: ISOString,
    subject: ObjectId,
    articleId: ObjectId,
    commentId: ObjectId,
    isread: Boolean
  } ]
}
```

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>
