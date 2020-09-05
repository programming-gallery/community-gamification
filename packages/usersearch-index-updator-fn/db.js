let { Pool } = require('pg')
const transform = require('stream-transform')
let copyTo = require('pg-copy-streams').from

let pool = new Pool()

let keys = [];

const docTransformer = transform(function(data){

  return data
})

pool.connect(function (err, client, done) {
  var stream = client.query(copyFrom('COPY my_table FROM STDIN'))
  var fileStream = fs.createReadStream('some_file.tsv')
  fileStream.on('error', done)
  stream.on('error', done)
  stream.on('finish', done)
  fileStream.pipe(stream)
})
