const config = require('./config')
const { loadSchema } = require('./dgraph')

async function print(){ 
    const name = `./${config.schema}`
    let data = ""
    if(name.endsWith(".js"))
        data = require(name)
    else
        data = await loadSchema(name)

    console.log(data)
}

print()