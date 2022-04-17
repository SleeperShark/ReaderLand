# User Sign Up API

-   **End Point:**&nbsp; `/user/signup`
-   **Method:**&nbsp; `POST`
-   **Request Headers**

|    Field    |  Type  |          Description           |
| :---------: | :----: | :----------------------------: |
| ContentType | String | Only accept `application/json` |

-   **Request Body**

|  Field   |  Type  | Description |
| :------: | :----: | :---------: |
|   name   | string |  Required   |
|  email   | string |  Required   |
| password | string |  Required   |

-   **Request Body Example**

```JSON
{
	"name": "test",
	"email": "test@test.com",
	"password": "test"
}
```

-   **Success Response: 200**

|    Field     |     Type      | Description             |
| :----------: | :-----------: | :---------------------- |
| access_token |    string     | Access token for server |
|     user     | `User Object` | User information        |

-   **Success Response Example**

```JSON
{
	"data": {
		"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm92aWRlciI6Im5hdGl2ZSIsIm5hbWUiOiJGb3VydGggVXNlciIsImVtYWlsIjoidGVzdGVyNEBleHByZXNzLmNvbSIsImlhdCI6MTY0OTY3NTYzMX0.rQ4jyVz3XOOOKkut5YIALbDjqTVHeDGgGbDKnC7oLJo",
		"user": {
			"_id": "6253eebef01a258713517965",
			"provider": "native",
			"email": "test@test.com",
			"name": "tester",
			"picture": "https://test.com/images/default.png"
		}
	}
}
```

-   **Email Already Exists: 443**

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

-   **Client Error Response: 400**

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

-   **Server Error Response: 500**

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

---

# User Sign in API

-   **End Point:**&nbsp; `/user/signin`
-   **Method:**&nbsp; `POST`
-   **Request Headers**

|    Field    |  Type  |          Description           |
| :---------: | :----: | :----------------------------: |
| ContentType | String | Only accept `application/json` |

-   **Request Body**

|  Field   |  Type  |           Description            |
| :------: | :----: | :------------------------------: |
| provider | string |       Only accept `native`       |
|  email   | string | Required if provider is `native` |
| password | string | Required if provider is `native` |

-   **Request Body Example**

```JSON
{
	"provider": "native",
	"email": "test@test.com",
	"password": "test"
}
```

-   **Success Response: 200**

|    Field     |     Type      | Description             |
| :----------: | :-----------: | :---------------------- |
| access_token |    string     | Access token for server |
|     user     | `User Object` | User information        |

-   **Success Response Example**

```JSON
{
	"data": {
		"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm92aWRlciI6Im5hdGl2ZSIsIm5hbWUiOiJGb3VydGggVXNlciIsImVtYWlsIjoidGVzdGVyNEBleHByZXNzLmNvbSIsImlhdCI6MTY0OTY3NTYzMX0.rQ4jyVz3XOOOKkut5YIALbDjqTVHeDGgGbDKnC7oLJo",
		"user": {
			"_id": "6253eebef01a258713517965",
			"provider": "native",
			"email": "test@test.com",
			"name": "tester",
			"picture": "https://test.com/images/default.png"
		}
	}
}
```

-   **Sign In Failed: 443**

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

-   **Client Error Response: 400**

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

-   **Server Error Response: 500**

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

---

# User Profile API

> Authorization

-   **End Point:**&nbsp; `/user/profile`
-   **Method:**&nbsp; `GET`
-   **Request Headers**

|     Field     |  Type  | Description                      |
| :-----------: | :----: | :------------------------------- |
| Authorization | String | Access token preceding `Bearer`. |

-   **Success Response: 200**

| Field |     Type      | Description |
| :---: | :-----------: | :---------: |
| data  | `User Object` |  User info  |

-   **Success Example**

```JSON
{
  "data": {
    "name": "SleeperShark",
    "email": "SleeperShark@appwork.com",
    "provider": "native",
    "follower": [],
    "followee": [],
    "favorite_articles": [],
    "subscribe_category":[{"category": "心理", "wieght": 1}],
  }
}
```

-   **Client Error (No token) Response: 401**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (Wrong token) Response: 403**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Server Error Response: 500**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

---

# User follow API

> Authorization

-   **End Point:**&nbsp; `/user/follow`
-   **Method:**&nbsp; `POST`
-   **Request Headers**

|     Field     |  Type  | Description                      |
| :-----------: | :----: | :------------------------------- |
| Authorization | String | Access token preceding `Bearer`. |
|  followerId   | String | Follower's id in BSON format     |

-   **Success Response: 200**

| Field |   Type   | Description |
| :---: | :------: | :---------: |
| data  | `String` | success msg |

-   **Success Example**

```JSON
{
  "data": "OK"
}
```

-   **Client Error (Bad request) Response: 400**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (No token) Response: 401**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (Wrong token) Response: 403**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Server Error Response: 500**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

---

# User unfollow API

> Authorization

-   **End Point:**&nbsp; `/user/follow`
-   **Method:**&nbsp; `DELETE`
-   **Request Headers**

|     Field     |  Type  | Description                      |
| :-----------: | :----: | :------------------------------- |
| Authorization | String | Access token preceding `Bearer`. |
|  followerId   | String | Follower's id in BSON format     |

-   **Success Response: 200**

| Field |   Type   | Description |
| :---: | :------: | :---------: |
| data  | `String` | success msg |

-   **Success Example**

```JSON
{
  "data": "OK"
}
```

-   **Client Error (Bad request) Response: 400**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (No token) Response: 401**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (Wrong token) Response: 403**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Server Error Response: 500**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

---

# User subscribe API

> Authorization

-   **End Point:**&nbsp; `/user/subscribe`
-   **Method:**&nbsp; `POST`
-   **Request Headers**

|     Field     |  Type  | Description                      |
| :-----------: | :----: | :------------------------------- |
| Authorization | String | Access token preceding `Bearer`. |
|   category    | String | Category user subscribe          |
|    weight     | Number | Category weight defined by user  |

-   **Success Response: 200**

| Field |   Type   | Description |
| :---: | :------: | :---------: |
| data  | `String` | success msg |

-   **Success Example**

```JSON
{
  "data": "OK"
}
```

-   **Client Error (Bad request) Response: 400**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (No token) Response: 401**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (Wrong token) Response: 403**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Server Error Response: 500**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

---

# User Unsubscribe API

> Authorization

-   **End Point:**&nbsp; `/user/subscribe`
-   **Method:**&nbsp; `DELETE`
-   **Request Headers**

|     Field     |  Type  | Description                      |
| :-----------: | :----: | :------------------------------- |
| Authorization | String | Access token preceding `Bearer`. |
|   category    | String | Category user unsubscribe        |

-   **Success Response: 200**

| Field |   Type   | Description |
| :---: | :------: | :---------: |
| data  | `String` | success msg |

-   **Success Example**

```JSON
{
  "data": "OK"
}
```

-   **Client Error (Bad request) Response: 400**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (No token) Response: 401**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (Wrong token) Response: 403**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Server Error Response: 500**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

---

# User Favorite API

> Authorization

-   **End Point:**&nbsp; `/user/favorite`
-   **Method:**&nbsp; `POST`
-   **Request Headers**

|     Field     |  Type  | Description                      |
| :-----------: | :----: | :------------------------------- |
| Authorization | String | Access token preceding `Bearer`. |
|   articleId   | String | Article id in BSON format        |

-   **Success Response: 200**

| Field |   Type   |         Description         |
| :---: | :------: | :-------------------------: |
| data  | `String` | Suceessfully update message |

-   **Success Example**

```JSON
{
  "data": "OK"
}
```

-   **Client Error (Bad request) Response: 400**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (No token) Response: 401**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (Wrong token) Response: 403**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Server Error Response: 500**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

---

# User Unfavorite API

> Authorization

-   **End Point:**&nbsp; `/user/favorite`
-   **Method:**&nbsp; `DELETE`
-   **Request Headers**

|     Field     |  Type  | Description                      |
| :-----------: | :----: | :------------------------------- |
| Authorization | String | Access token preceding `Bearer`. |
|   ArticleId   | String | Article id in BSON format        |

-   **Success Response: 200**

| Field |   Type   |         Description         |
| :---: | :------: | :-------------------------: |
| data  | `String` | Successfully update message |

-   **Success Example**

```JSON
{
  "data": "OK"
}
```

-   **Client Error (Bad request) Response: 400**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (No token) Response: 401**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Client Error (Wrong token) Response: 403**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Server Error Response: 500**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

---
