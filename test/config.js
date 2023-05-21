module.exports = {
    schema: __dirname + "../schema/schema.js",
    url: "http://db",
    port: "8080",
    claims: "https://my.app.io/jwt/claims",
    secret: "secret",
    schemaFooter: (c) => `# Dgraph.Authorization {"VerificationKey":"${c.secret}","Header":"Authorization","Namespace":"${c.claims}","Algo":"HS256","Audience":["aud1","aud5"]}`
}