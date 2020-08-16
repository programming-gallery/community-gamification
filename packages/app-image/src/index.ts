import * as express from 'express';
import * as path from 'path';
import { AsyncRouter } from 'express-async-router';

import * as datastore from './datastore'

const port = 8000; 
let router = AsyncRouter();

router.get("/", async (req, res) => {
  res.send('hi');
});
router.get("/gallery-map", async (req, res) => {
  res.json(await datastore.get('gallery-map'));
});

const app = express();
app.use('/data', router);
console.log('static path:', path.join(__dirname, '../../', 'svelte-app/public'))
app.use(express.static(path.join(__dirname, '../../', 'svelte-app/public')))


app.listen(port)
