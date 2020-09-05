import moment from 'moment';
import 'moment/locale/ko'
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
async function search(fetch, valueType, keyType, key, timestamp = new Date().getTime()) {
  let db = `${valueType}:${keyType}`;
  let right = `${key}:${timestamp}`;
  let left = `${key}:`;
  let url = `${host}/${db}?left=${left}&right=${right}&reverse=true`
  let res = (await fetch(url));
  if(res.status === 200)
    return (await res.json()).map(parse.bind(this, valueType));
  else
    throw Error(res.status, await res.text());
}
function parse(type, d) {
  d = JSON.parse(d[1]);
  let o = d.reduce((acc, d, i) => (acc[keys[type][i]] = d, acc), {});
  o.createdat = new Date(o.createdat*1000);
  if(o.createdat.getFullYear() < 2010)
    o.createdat.setYear(2020);
  o.fromnow = moment(o.createdat).fromNow();
  return o
}

export function get({ query }, res) {
  search(this.fetch, "doc", query.keyType, query.key, query.timestamp).then(documents => {
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(documents);
  });
}
