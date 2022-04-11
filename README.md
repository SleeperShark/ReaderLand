# ReaderLand

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

-   **Success Response: ** 200

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

-   **Email Already Exists:** 443

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

-   **Client Error Response:** 400

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

-   **Server Error Response:** 500

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

-   **Success Response:** 200

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

-   **Sign In Failed:** 443

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

-   **Client Error Response:** 400

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |

-   **Server Error Response:** 500

| Field |  Type  |  Description  |
| :---: | :----: | :-----------: |
| error | string | Error message |
