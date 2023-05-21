const Docker = require('node-docker-api').Docker
const {compile} = require("ypipe")
const { w } = require("ypipe-watch");
const npm = require('npm-commands')
const {dgraph} = require('ypipe-dgraph')
const config = require("./config")

let _d = new Docker({ socketPath: '/var/run/docker.sock' })

function test(){
    npm().run('tap');
}

const dql = dgraph(config)

async function main() {
    const t = `w'[ dql? | test ]
               down
            `;
    const f = compile(t, {
                            namespace: {dql, test}, 
                            plugins: {w: w(["./tests/*.js", "./schema/*.*"])}
        });
    await f();
}

main()

