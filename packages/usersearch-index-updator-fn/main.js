const athena = require("athena-client");
const axios = require("axios");

const clientConfig = {
  bucketUri: 's3://cgdev-bucket83908e77-ih328acqmull/athena-ddl-query-result/',
  database: 'cg_dev',
  workGroup: 'primary',
}
const awsConfig = {
    region: 'ap-northeast-2',
}
const kvstoreHost = 'http://2xkj.s.time4vps.cloud:7700';

const client = athena.createClient(clientConfig, awsConfig)

async function query(sql) {
  return (await client.execute(sql).toPromise()).records;
}

function timeToDatewithhours(at) {
  return at.toISOString().slice(0,13).replace('T', '-');
}

let keys = {
  doc: ['id', 'galleryid', 'galleryisminer', 'userid', 'usernickname', 'userip', 'createdat', 'title', 'hasvideo', 'hasimage', 'commentcount', 'viewcount', 'likecount'],
  com: ['id', 'galleryid', 'galleryisminer', 'documentid', 'parentid', 'userid', 'usernickname', 'userip', 'createdat', 'contents'],
}
let keyIndexes = {
  doc: {},
  com: {},
}
for(let i in keys.doc)
  keyIndexes.doc[keys.doc[i]] = i;
let COM_KEY_INDEXES = {};
for(let i in keys.com)
  keyIndexes.com[keys.com[i]] = i;


async function index(from, to, target) {
  //const dhTo = timeToDatewithhours(to);
  /*at.setHours(at.getHours() - period);
  const back = timeToDatewithhours(at);*/
  const dhTo = timeToDatewithhours(to);
  const dhMin = timeToDatewithhours(from);
  let past = new Date(from);
  past.setHours(past.getHours() - 24);
  const dhFrom = timeToDatewithhours(past);
  console.log(new Date(), target, from, '~', to);
  from = parseInt(from.getTime()/1000);
  to = parseInt(to.getTime()/1000);
  let sql;
  if(target === 'doc') {
    sql = `
    SELECT 
      CAST(ROW(${keys.doc.join(",")}) AS JSON) as json
    FROM (
     SELECT
       id, galleryid,
       ARBITRARY(galleryisminer) galleryisminer,
       ARBITRARY(userid) userid, ARBITRARY(usernickname) usernickname, ARBITRARY(userip) userip,
       CAST(TO_UNIXTIME(ARBITRARY(createdat)) AS BIGINT) createdat,
       ARBITRARY(title) title,
       ARBITRARY(hasvideo) hasvideo, ARBITRARY(hasimage) hasimage,
       MAX(commentcount) commentcount, MAX(viewcount) viewcount, MAX(likecount) likecount,
       COUNT(*) logcount, MAX(datewithhours) datewithhours
     FROM dcinside_document
     WHERE 
       datewithhours <= '${dhTo}' AND datewithhours >= '${dhFrom}'
     GROUP BY 1,2
    )
    WHERE createdat IS NOT NULL
       AND ((createdat < ${to} AND createdat >= ${from}) OR (createdat < ${from} AND logcount >= 2 AND datewithhours >= '${dhMin}'))
    ORDER BY createdat;
    `;
  } else if(target === 'com') {
    sql = `
    SELECT 
      CAST(ROW(${keys.com.join(",")}) AS JSON) as json
    FROM (
     SELECT
       id, documentid, galleryid,
       ARBITRARY(galleryisminer) galleryisminer,
       ARBITRARY(parentid) parentid,
       ARBITRARY(userid) userid, ARBITRARY(usernickname) usernickname, ARBITRARY(userip) userip,
       CAST(TO_UNIXTIME(ARBITRARY(createdat)) AS BIGINT) createdat,
       COALESCE(
         ARBITRARY(contents),
         IF(ARBITRARY(dcconpackageid) IS NOT NULL, '@dccon'),
         IF(ARBITRARY(voicecopyid) IS NOT NULL, '@voice')
       ) contents,
       COUNT(*) logcount, MAX(datewithhours) datewithhours
     FROM dcinside_comment
     WHERE datewithhours <= '${dhTo}' AND datewithhours >= '${dhFrom}'
     GROUP BY 1,2,3
    )
    WHERE createdat IS NOT NULL
       AND ((createdat < ${to} AND createdat >= ${from}) OR (createdat < ${from} AND logcount >= 2 AND datewithhours >= '${dhMin}'))
    ORDER BY createdat;
    `;
  } else {
    throw Error('target should be one of ["com", "doc"]')
  }
  let rows = await query(sql);
  let indexes = {
    uid: [],
    guid: [],
    uip: [],
    guip: [],
    unn: [],
    gunn: [],
    uni: [],
    guni: [],
  };
  console.log("rows:", rows.length)
  for(let row of rows) {
    let list = JSON.parse(row.json);
    if(list[keyIndexes.createdat] < 1536085233) {
      list[keyIndexes.createdat] = p
      list[keyIndexes.createdat] = parseInt(new Date(list[keyIndexes.createdat]*1000).setYear(2020) / 1000)
      row.json = JSON.stringify(list);
    }
    let parsed = {};
    for(let i in list) parsed[keys[target][i]] = list[i];
    if(parsed.userid) {
      indexes.uid.push([`${parsed.userid}:${parsed.createdat}:${parsed.id}`, row.json]);
      indexes.guid.push([`${parsed.galleryid}:${parsed.userid}:${parsed.createdat}:${parsed.id}`, row.json]);
    } else {
      indexes.uip.push([`${parsed.userip}:${parsed.createdat}:${parsed.id}`, row.json]);
      indexes.unn.push([`${parsed.usernickname}:${parsed.createdat}:${parsed.id}`, row.json]);
      indexes.uni.push([`${parsed.usernickname}(${parsed.userip}):${parsed.createdat}:${parsed.id}`, row.json]);
      indexes.guip.push([`${parsed.galleryid}:${parsed.userip}:${parsed.createdat}:${parsed.id}`, row.json]);
      indexes.gunn.push([`${parsed.galleryid}:${parsed.usernickname}:${parsed.createdat}:${parsed.id}`, row.json]);
      indexes.guni.push([`${parsed.galleryid}:${parsed.usernickname}(${parsed.userip}):${parsed.createdat}:${parsed.id}`, row.json]);
    }
    for(let keyType in indexes) {
      if(indexes[keyType].length > 200000) {
        await updateIndexes(`${target}:${keyType}`,indexes[keyType]);
        indexes[keyType] = [];
      }
    }
  }
  for(let keyType in indexes) {
    await updateIndexes(`${target}:${keyType}`,indexes[keyType]);
  }
}

async function updateIndexes(db, indexes) {
  try {
    await axios.post(`${kvstoreHost}/${db}`, indexes, {
      'maxContentLength': Infinity,
      'maxBodyLength': Infinity
    });
  } catch(e) {
    if (e.response) {
      console.log(e.response.status, e.response.data);
    } else {
      throw e;
    }
  }
}

async function initialIndex() {
  //let t = (await query(`SELECT min(datewithhours) t FROM dcinside_document`))[0].t;
  //let from = new Date(t.slice(0, 10) + "T" + t.slice(-2) + ":00:00").getTime();
  let from = new Date("2020-09-05T14:33:56.170Z").getTime();
  let to = new Date().getTime();
  const period = 3*24*3600*1000
  while(from + period < to) {
    await index(new Date(from), new Date(from + period), "doc");
    await index(new Date(from), new Date(from + period), "com");
    from += period;
  }
  await index(new Date(from), new Date(to), "doc");
  await index(new Date(from), new Date(to), "com");
}

exports.handler = async (event, context) => {
  now = new Date();
  await index(new Date(now - 3600*1000), new Date(), "doc");
  await index(new Date(now - 3600*1000), new Date(), "com");
};

//exports.handler();
initialIndex();

//initialIndex();
//index(new Date());
