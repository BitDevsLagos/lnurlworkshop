const express = require('express');
const { bech32 } = require('bech32');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');
const dotenv = require('dotenv');
const { connect, createInvoice } = require('./lnd')
const jwt = require('jsonwebtoken');
const axios = require('axios');

dotenv.config();
const app = express();
//connect();
app.use(bodyParser.json());
app.use(cors({
   origin: '*',
   methods: ['GET', 'POST'],
   allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.get('/', (req, res) => {
   testGhost();
  res.send('Welcome to LNURL world!');
});

app.get('/lnurl', (req, res) => {
    const metadata = [
        ["text/plain", "LNURL tutorial endpoint"]
    ];
    const response = {
        callback: `${process.env.BACKEND_URL}/callback`,
        maxSendable: 100000000, // milisatoshis
        minSendable: 1000,      // milisatoshis
        metadata: JSON.stringify(metadata),
        tag: "payRequest"
    };
    res.json(response);
 });
 
 app.get('/getlnurl', async (req, res) => {
    const originalUrl = `${process.env.BACKEND_URL}/lnurl`
    const encodedLnurl = encodeLnurl(originalUrl);
 
    res.json({
        lnurl: encodedLnurl
    });
 });
 
 app.get('/callback', async (req, res) => {
    const { amount } = req.query;
 
    const metadata = [["text/plain", "LNURL tutorial endpoint"]];
    const metadataString = JSON.stringify(metadata);
    const hash = crypto.createHash('sha256').update(metadataString).digest('hex');
   
    const descriptionHash = Buffer.from(hash, 'hex').toString('base64'); // Encoding as base64
 
    // Convert amount from millisatoshis to satoshis
    const value = parseInt(amount) / 1000;
 
    const invoice = await createInvoice({ value, description_hash: descriptionHash });
 
    console.log(invoice);
 
    const response = {
        pr: invoice.payment_request,
        routes: []
    };
 
    res.json(response);
 });
 
 
 function encodeLnurl(url) {
    const words = bech32.toWords(Buffer.from(url, 'utf8'));
    return bech32.encode('lnurl', words, 2000).toUpperCase();
 }

 function testGhost() {
   const key = '67e66ced98b8ad0001532320:4331701340eae7dd85784b808e9e9bcfba56066c394f894396d34f282b55731e';

   // Split the key into ID and SECRET
   const [id, secret] = key.split(':');

   // Create the token (including decoding secret)
   const token = jwt.sign({}, Buffer.from(secret, 'hex'), {
      keyid: id,
      algorithm: 'HS256',
      expiresIn: '5m',
      audience: `/admin/`
   });

   // Make an authenticated request to create a post
   const url = 'https://bitcoin-is-the-future.ghost.io/ghost/api/admin/posts/';
   const headers = { Authorization: `Ghost ${token}` };
   const payload = { posts: [{ title: 'Hello World' }] };
   axios.post(url, payload, { headers })
      .then(response => console.log(response))
      .catch(error => console.error(error));
}
 

app.listen(process.env.PORT || 3000, () => {
   console.log(`Server listening on port ${process.env.PORT || 3000}`)
});
