# sveltekit app with dgraph backend

Given the next files as a running workspace:

`docker-compose.yaml`

```yaml
services:
  db:
    image: dgraph/standalone:master
    ports:
      - 8080:8080
  code: 
    build: .
    ports: 
      - 8080
      - 5173
    #volumes:
    #   - "$HOME/.config:/root/.config"
    command:
      - /bin/sh
      - -c
      - |
        git clone https://github.com/yellowmachine/ika-example-dgraph.git .
        code-server /project
```

`Dockerfile`

```Dockerfile
FROM node:16-bullseye

RUN apt-get update 
RUN apt-get install -y \
  build-essential \
  pkg-config \
  python3

RUN curl -fsSL https://code-server.dev/install.sh | sh

COPY config.yaml /root/.config/code-server/
WORKDIR /project

CMD code-server
```

`config.yaml`

```yaml
bind-addr: 0.0.0.0:8080
auth: password
password: secret
cert: false
```

You can access code-server opening http://localhost:3000 and do `cd dgraph && npm run test` (npm i is done automatically before, see .vscode folder).

Let's give a little of explanation:

`./dgraph/index.js`

```js
// a pipeline that whatches to changes in folder tests and schema, then executes test task
const {compile} = require("ypipe")
const { w } = require("ypipe-watch");
const npm = require('npm-commands')
const {dgraph} = require('ypipe-dgraph')
const config = require("./config")

/* config.js
module.exports = {
    schema: __dirname + "/schema/schema.js",
    url: "http://db",
    port: "8080",
    claims: "https://my.app.io/jwt/claims",
    secret: "secret",
    schemaFooter: (c) => `# Dgraph.Authorization {"VerificationKey":"${c.secret}","Header":"Authorization","Namespace":"${c.claims}","Algo":"HS256","Audience":["aud1","aud5"]}`
}
*/

function test(){
    npm().run('tap');
}

const dql = dgraph(config) // just send a schema to database

async function main() {
    const t = `w'[ dql? | test ]`; // pipeline expression, see ypipe: https://github.com/yellowmachine/ypipe
    const f = compile(t, {
                            namespace: {dql, test}, 
                            plugins: {w: w(["./tests/*.js", "./schema/*.*"])}
        });
    await f();
}

main()
```

The pipeline is based on [ypipe](https://github.com/yellowmachine/ypipe)

```json
"scripts": {
    "print": "node print.js",
    "test": "node index.js",
    "tap": "tap --no-coverage-report --no-check-coverage ./tests/*.test.js"
  },
```

`./dgraph/schema/schema.js`

```js
const { quote, gql } = require('ypipe-dgraph')

const ADMIN = quote("ADMIN")

module.exports = gql`
type Job @auth(
    query: {
        rule:  "{$ROLE: { eq: ${ADMIN} } }" 
    }
){
    id: ID!
    title: String!
    completed: Boolean!
    command: String!
}
`
```

`./dgraph/test/1.test.js`

```js
const tap = require('tap')
const { dropData, client, gql} = require('ypipe-dgraph')
const config = require("../config")

SETUP = gql`
mutation MyMutation {
  addJob(input: {title: "send mails", completed: false, command: "mail ..."}){
    job{
      id
    }
  }
}
`
QUERY = gql`
query MyQuery {
  queryJob {
    id
    title
    completed
  }
}
`

tap.beforeEach(async () => {
  await dropData(config)
});

tap.test('wow!', async (t) => {
    await client({ROLE: 'ADMIN'}, config).request(SETUP)
    let response = await client({ROLE: 'NONO'}, config).request(QUERY)
    t.equal(response.queryJob.length, 0)
});
```

The test is very simple, just add data with the Role ADMIN and then query with other role, and there's a rule about role so we get 0 rows of result.

You can change either test files in test folder or the schema files, and tests are run automatically.

Example result in console:



If you want to use plain graphql:

`schema.graphql`

```graphql
#include enum.graphql

type Job @auth(
    query: {
        rule:  "{$ROLE: { eq: \"ADMIN\" } }" 
    }
){
    id: ID!
    title: String!
    completed: Boolean!
    command: String!
}
```

`enum.graphql`

```graphql
enum Role {
  ADMIN
  DEVELOPER
}
```

You have to set this in `config.js`:

```js
module.exports = {
    schema: __dirname + "/schema/schema.js", // js or graphql
    url: "http://db",  // where is database 
    port: "8080",      // port database is listening to
    claims: "https://my.app.io/jwt/claims",
    secret: "secret",
    schemaFooter: (c) => `# Dgraph.Authorization {"VerificationKey":"${c.secret}","Header":"Authorization","Namespace":"${c.claims}","Algo":"HS256","Audience":["aud1","aud5"]}`
}
```