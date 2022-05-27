# [ReaderLand](https://headache.services/)

An article-based social platform for creative writers and inquisitive readers.

<details id="table-of-content">
  <summary>Table of Conetents</summary>
  
  ### ReaderLand Tutorial
    
  * [Registration](#registration)
  * [Index Page](#index-page)
  * [Article Page](#article-page)
  * [Editing Page](#editing-page)
  * [Profile Page](#profile-page)
  
  ### Website Structure
  
  * [Architecture](#architecture)
  * [Database Collection Schema](#database-collection-schema)
  
</details>

---

# ReaderLand Tutorial

## Registration

![Email Validation](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/Email_Validation.jpg)

After submitting the sign up form, user's will reveive an validation mail titled "ReaderLand 信箱驗證".
Click the link in the mail context to finish the registration validation, then start your journey of knowledge in the ReaderLand!

Please note that the unvalidated account will be remove 10 minutes after registration, and user can't register with email already validated in ReaderLand.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## Index Page

![Index Page](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/index_page.jpg)

Readers can leisurely skim through aritcles newsfeeds displayed by time-series, categories, or customized newsfeed.
Board on the left side lists subscritions and weights of the categories for the articles, user can adjust it in their own profile page.

In each article card, user can scan the summary of the article. Click the title to enjoy whole article, or save it to your favorite list by clicking book mark icon on the top-right corner.
Hover on the author's avatar to see author's short introduction. Click the avatar to see the author's page and start to follow him by hit the follow button.

More Article cards will be rendered at the bottom when scrolling down the page, or reload the newsfeed by clicking refresh button on the right side of each tab.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>
  
## Article Page

![Article Page](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/article_page.jpg)

In addition to just reading article, readers can hit the like button, save it to their favorite list, share the article with the link copy button, and participate in real-time discussion on the comment board with author and other readers.

Author will receive notification when readers like the article or leave a comment, and readers will be notified if the author replies their comments as well.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## Editing Page

![Editing Page](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/editing_page.jpg)

ReaderLand provides a concise interface and fluent user experice that help writer concentrate on the content production.

When editing, writers can output their ideas efficiently and effortlessly without moving their hand away from the keyboard: you can move the cusor among paragraphs with page-up and page-down keys, insert new paragraph right below the current one with enter, and remove the paragrapg with backspace if it's empty.

Linked-list structured paragraphs allows accurate auto-saving for every updated contents, users can reload the draft and resume their works without the concern of losing progress.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## Profile Page

![Profile Page](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/profile_page.jpg)

In profile page, users can: 
  * Edit their avatar, username and introduction.
  * Manage favorited articles, draft and published articles.
  * Check the followrs and fans.
  * Adjust categories and weight they subscribed.

ReaderLand features user-defined newsfeed algorithm, which release readers from the black box algorithm tyranny.
In subscription tab, readers can subscribe cateogories interest them and adjust the weight of each category. Server will then filter and sort articles by the subscription and author they follow, generating their personalized newsfeed contents on the index page.

To see detailed explanations on the newsfeed algorithm, please check following section.

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

---

# Website Structure

## Architecture

![Architecture](https://reader-land.s3.ap-northeast-1.amazonaws.com/README/Archietecture.jpg)

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>

## Database Collection Schema

### User

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

### Category

```
{
  _id: ObjectId, 
  category: String,
}
```

### Article

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


### Draft 

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

### Notification

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

## EdgeRank-like Weight Algorithm

![newsfeed](https://user-images.githubusercontent.com/88277367/170655361-8bcdbf6d-0d6e-4e8f-8bbc-647657c235c9.jpg)

In newsfeed generation, the server will filter articles written by the user's followers or matching the user's subscription, then sort articles by a preference weight derived from this EdgeRank-like weight algorithm.

The algorithm is composed of 3 parameters: 

  * **Preference Weight = ( 1 + SUM_OF_CAT_WEIGHT ) * ( FOLLOWER_WEIGHT )**
     
    Every article will start with a base weight of 1, then add the category weight derived from the user's subscription to it, and finally, multiply the total weight by follower weight if the article was written by one of the user's followers.
    
    For instance, if one article is categorized as "投資理財" and "職場產業" while the reader subscribes "投資理財" with weight of 5, the preference weight of the article is 1 + 5 = 6;
    
    If author of the article is also followed by the user, multiply the number by FOLLOWER_WEIGHT ( 3 in current environment ) to get the final preference weight.
    
    FOLLOWER_WIGHT is editable in `.env`.
    
    ---
  
  * **Polularity Weight =**
  
     <p><strong> READ_WEIGHT<sup>(READ_COUNT / READ_DIV)</sup> * LIKE_WEIGHT<sup>(LIKE_COUNT / LIKE_DIV)</sup> * COMMENT_WEIGHT<sup>(COMMENT_COUNT / COMMENT_DIV) </sup> </strong></p>
     
     Popularity weight is the product of 3 feedback weights (views, likes and comments) each derived from their original weight to the power of count/divisor.
     
     Original weights and count divisor for each feedback type can be adjusted in `.env`.
      
  * Time Decayer

<p align="right">
(<a href="#table-of-content">Back to top</a>)
</p>
