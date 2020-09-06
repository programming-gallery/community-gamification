import sirv from 'sirv';
import polka from 'polka';
import compression from 'compression';
import * as sapper from '@sapper/server';

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === 'development';

polka() // You can also use Express
  .get('/api/test', (req, res) => res.end("test.."))
  .get('/api/q', ({ query }, res, next) => {
    search(query.valueType, query.keyType, query.key, query.timestamp).then(list => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
      });
      res.end(JSON.stringify(list))
    }).catch(e => next(e));
  })
	.use(
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		sapper.middleware()
	)
	.listen(PORT, err => {
		if (err) console.log('error', err);
	});


import moment from 'moment';
import 'moment/locale/ko';
import fetch from 'node-fetch';
moment.locale('ko');
const host = 'http://2xkj.s.time4vps.cloud'
const TOP_CHAR = String.fromCharCode(255);
let keys = {
  doc: ['id', 'galleryid', 'galleryisminer', 'userid', 'usernickname', 'userip', 'createdat', 'title', 'hasvideo', 'hasimage', 'commentcount', 'viewcount', 'likecount'],
  com: ['id', 'galleryid', 'galleryisminer', 'documentid', 'parentid', 'userid', 'usernickname', 'userip', 'createdat', 'contents'],
}
/* ValueType: "doc" or "com" 
 * KeyType: uid, uip, unn, uni,  guid, guip, gunn, guni
*/
async function search(valueType, keyType, key, timestamp = new Date().getTime()) {
  let db = encodeURIComponent(`${valueType}:${keyType}`);
  let right = encodeURIComponent(`${key}:${parseInt(timestamp/1000) || 9}`);
  let left = encodeURIComponent(`${key}:1`);
  let url = `${host}/${db}?left=${left}&right=${right}&reverse=true`
  let res = (await fetch(url));
  if(valueType === 'com') {
    if(res.status === 200){
      return (await res.json()).map(parse.bind(this, valueType))
    }else
      throw Error(res.status, await res.text());
  } else {
    if(res.status === 200)
      return (await res.json()).map(parse.bind(this, valueType));
    else
      throw Error(res.status, await res.text());
  }
}
function parse(type, d) {
  d = JSON.parse(d[1]);
  let o = d.reduce((acc, d, i) => (acc[keys[type][i]] = d, acc), {});
  o.originalcreatedat = o.createdat;
  o.createdat = new Date(o.createdat*1000);
  if(o.createdat.getFullYear() < 2010)
    o.createdat.setYear(2020);
  o.fromnow = moment(o.createdat).fromNow();
  return o
}
