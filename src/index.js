const express = require('express');
const app = express();
const fetch = require('node-fetch');
global.Headers = global.Headers || require("fetch-headers");

const fetchData = () => 
    fetch('https://api.pocketsmith.com/v2/me', {
        headers: new Headers({
            'Authorization':'Key 785d4917727723a1f779669f9ac0efb15a2844dea5e08d034441949f38b986a6fac2b5bc31f013230c7b88920c92f734f67c467b83975dd8d4013009da42ad84'
        })
    })
    .then(response => response.text());

app.use('/data', (req, res) => 
{
    fetchData()
    .then(output => res.send(output));
});

app.listen(4000);
console.log('listening...');
