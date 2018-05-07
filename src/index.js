
const express = require('express');
const fetchData = require('./ps-data');

const app = express();

require('dotenv').config()

app.use('/data', (req, res) => 
{
    let userid = fetchData.fetchID();

    // userid
    // .then(id => fetchData.fetchBudgets(id))
    // .then(output => res.send(output));
    let categories = userid
    .then(id => {
        console.log('ID', id);
        return fetchData.fetchCategories(id);
    });
    
    let scenarios = userid
    .then(id => fetchData.fetchScenarios(id));

    return Promise.all([userid, categories, scenarios])
    .then(([id, catlist, scenlist]) =>
        fetchData.fetchTrends(id, catlist, scenlist)
    )
    .then(output => {
        console.log('what!',output );
        res.send( output );
    });
});

app.listen(4000);
console.log('listening...');
