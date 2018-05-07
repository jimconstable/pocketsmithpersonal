const fetch = require('node-fetch');
const { URL, URLSearchParams } = require('url');

const psfetch = url => 
    fetch(url, {
        headers: {
        'Authorization':'Key ' + process.env.PSKEY
        }
    })
    .then(response => response.json());
    

const fetchID = () => 
    psfetch('https://api.pocketsmith.com/v2/me')
    .then(data => data.id);

const fetchCategories = (id) => 
    psfetch('https://api.pocketsmith.com/v2/users/' + id +'/categories'  )
    .then(cats => cats.reduce(catConCat,''));

const catConCat = (acc, val) => {
    let childs = val.children.reduce(catConCat, '');
    return acc 
        + (acc === '' ? '' : ',' ) 
        + val.id 
        + (childs === '' ? '' : ',' + childs)
}

const fetchTrends = (id, catlist, scenlist) => {
    let trendUrl = new URL(
        'https://api.pocketsmith.com/v2/users/' 
        + id 
        + '/trend_analysis');
     
    trendUrl.search = new URLSearchParams({
        categories : catlist,
        scenarios : scenlist,
        start_date : '2018-01-01',
        end_date : '2018-12-31',
        period : 'months',
        interval : 1
    });

    return psfetch(trendUrl.toString());   
};

const fetchBudgets = (id) => {
    let psUrl = new URL(
        'https://api.pocketsmith.com/v2/users/' 
        + id 
        + '/budget_summary');
     
    psUrl.search = new URLSearchParams({
        start_date : '2018-01-01',
        end_date : '2018-12-31',
        period : 'months',
        interval : 1
    });

    return psfetch(psUrl.toString() );   
};

const fetchScenarios = (id) => 
    psfetch('https://api.pocketsmith.com/v2/users/' + id +'/accounts' )
    .then(accounts => 
         accounts.reduce(scenConCat,'')
    );

const scenConCat = (acc, val) => {
    return acc 
        + (acc === '' ? '' : ',' ) 
        + val.primary_scenario.id
}

module.exports = {
    fetchID,
    fetchCategories,
    fetchTrends,
    fetchScenarios,
    fetchBudgets
};