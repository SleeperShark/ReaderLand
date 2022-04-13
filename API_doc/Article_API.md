# Article Create API

> Authorization

-   **End Point:**&nbsp; `/articles`
-   **Method:**&nbsp; `POST`
-   **Request Headers**

|     Field     |  Type  | Description                      |
| :-----------: | :----: | :------------------------------- |
|  ContentType  | String | Only accept `application/json`   |
| Authorization | String | Access token preceding `Bearer`. |

-   **Success Response: 200**

| Field |       Type       | Description  |
| :---: | :--------------: | :----------: |
| data  | `Article Object` | Article info |

-   **Success Example**

```JSON
{
	"data": {
		"_id": "6254e221c9882cc867f197fe"
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

-   **Client Error (Title duplicate) Response: 400**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Server Error Response: 500**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

---

# Customized Newsfeed API

> Authorization

-   **End Point:**&nbsp; `/articles/newsfeed`
-   **Method:**&nbsp; `GET`
-   **Request Headers**

|     Field     |  Type  | Description                      |
| :-----------: | :----: | :------------------------------- |
| Authorization | String | Access token preceding `Bearer`. |

-   **Success Response: 200**

| Field |       Type       | Description                     |
| :---: | :--------------: | :------------------------------ |
| data  | `Articles Array` | Array of article preview object |

-   **Success Example**

```JSON
{
	"data": [
		{
            "_id": "625642ffb0f5164aba16d081",
            "createdAt": "2022-04-13T00:34:05.136Z",
            "readCount": 72,
            "category": [
                "政治",
                "健康與情感"
            ],
            "author": {
                "_id": "62552d0d7b58b0fc7cd45767",
                "name": "Tester-13"
            },
            "likeCount": 10,
            "preview": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500",
            "commentCount": 5,
            "weight": "24.726"
        }
	]
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

-   **Client Error (Title duplicate) Response: 400**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

-   **Server Error Response: 500**

| Field |  Type  | Description   |
| :---: | :----: | :------------ |
| error | String | Error Message |

---
