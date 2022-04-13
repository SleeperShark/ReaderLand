# Article Create API

> Authorization

-   **End Point:**&nbsp; `/article`
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
    | Field | Type | Description |
    | :---------: | :----: | :---------------------------- |
    | error | String | Error Message |

-   **Client Error (Wrong token) Response: 403**
    | Field | Type | Description |
    | :---------: | :----: | :---------------------------- |
    | error | String | Error Message |

-   **Client Error (Title duplicate) Response: 400**
    | Field | Type | Description |
    | :---------: | :----: | :---------------------------- |
    | error | String | Error Message |

-   **Server Error Response: 500**
    | Field | Type | Description |
    | :---------: | :----: | :---------------------------- |
    | error | String | Error Message |
