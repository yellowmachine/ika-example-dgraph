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