const express = require('express');
const fetchData = require('./ps-data');

const app = express();

require('dotenv').config()

app.use('/public', express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use('/data', (req, res) => 
{
    fetchData.allCategories()
    .then(output => {
       res.send( output );
    });    
});

app.use('/listcats', (req, res) => 
{
    fetchData.listCategories()
    .then(output => {
       res.send( output );
    });    
});


app.use('/totals', (req, res) => 
{
    fetchData.totalsOnly()
    .then(output => {
       res.send( output );
    });    
});

app.use('/test', (req, res) => 
{
    fetchData.test().then(output => res.json(output)) ;
});

app.listen(4000);
console.log('listening...');
