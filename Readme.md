## Rename an exsiting branch

- git branch -M "New Branch Name"

### CORS_ORIGIN = \* -> Indicates, req coming from anywhere it's ok

- app.use(express.json({ limit: "20kb" })) - The limit option in express.json() middleware specifies the maximum size of the request body that the server will accept

## URL ENCODED MIDDLEWARE

- app.use(express.urlencoded({ extended: true, limit: "10kb" })) - URL encoding is a way to represent special characters in URLs. For example, spaces are replaced with %20 and special characters like + are encoded. So when you mention: e.g. "url coming in form of 20% or +"

- This middleware parses incoming requests with URL-encoded payloads (typically sent by forms with the application/x-www-form-urlencoded content type). It converts the data into a JavaScript object, making it easy to work with in your routes.

- When extended: true, the express.urlencoded() middleware allows the parsing of richer data, such as nested objects or arrays, in URL-encoded form.

- Limit - This specifies that the server will only accept URL-encoded request bodies up to 10 kilobytes (KB). If the payload exceeds this limit, the server will reject the request and return a 413 Payload Too Large error.

## HTTP

- URL, URI, URA - Uniform Resource Locater , Indentifier, Name
