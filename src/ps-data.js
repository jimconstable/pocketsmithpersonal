const fetch = require('node-fetch');
const { URL, URLSearchParams } = require('url');
const fs = require("fs-extra");
const path  = require('path');

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

    return psfetch(trendUrl.toString())
    .then(trends => {
        return { 
            income : {
                total_actual_amount : trends.income.total_actual_amount,
                total_forecast_amount : trends.income.total_forecast_amount,
                periods : trends.income.periods.map(item => ({
                    start_date : item.start_date,
                    actual_amount : item.actual_amount,
                    forecast_amount : item.forecast_amount,
                    refund_amount : item.refund_amount
                })) 
            },
            expense :{
                total_actual_amount : trends.expense.total_actual_amount,
                total_forecast_amount : trends.expense.total_forecast_amount,
                periods : trends.expense.periods.map(item => ({
                    start_date : item.start_date,
                    actual_amount : item.actual_amount,
                    forecast_amount : item.forecast_amount,
                    refund_amount : item.refund_amount
                }) )
            }
        }
    });   
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

const fetchScenarios = (id) => {
    let allAccounts = psfetch('https://api.pocketsmith.com/v2/users/' + id +'/accounts' )
    let transAccounts = fs.readJson(path.join(__dirname, '..', 'accounts.json'));
    
    return Promise.all([allAccounts, transAccounts])
    .then(([allacc, transacc])=>
        allacc.filter(item => transacc.includes(item.title))
    )
    .then(accounts => accounts.reduce(scenConCat,''));
}
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