const fetch = require('node-fetch');
const { URL, URLSearchParams } = require('url');
const fs = require("fs-extra");
const path  = require('path');

const periodbase = ['01','02','03','04','05','06','07','08','09','10','11','12']
.map( item => ({
        start_date: '2018-' + item + '-01',
        actual_amount : 0,
        refund_amount : 0,
        forecast_amount : 0
    }))

const apipath = 'https://api.pocketsmith.com/v2'

const psfetch = url => 
    fetch(url, {
        headers: {
        'Authorization':'Key ' + process.env.PSKEY
        }
    })
    .then(response => response.json());

const fetchID = () => 
    psfetch(apipath + '/me')
    .then(data => data.id);

const fetchCategories = (id) => 
    psfetch(apipath + '/users/' + id +'/categories'  )
    .then(cats => cats.filter(item => item.title != 'Transfers'))
    .then(filteredcats => filteredcats.reduce(catConCat,[]));

const catConCat = (acc, val) => {
    let childs = val.children.reduce(catConCat, []);
    acc.push({id:val.id,title:val.title,parent_id:val.parent_id});
    if(childs.length > 0) acc.push(...childs);
    return acc;
}

const fetchTrends = (id, catlist, scenlist) => {
    let trendUrl = new URL(
        apipath + '/users/' 
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
        let incomePeriods =  (trends.income == null) ? periodbase : trends.income.periods
        let expensePeriods = (trends.expense == null) ? periodbase : trends.expense.periods
        
        return incomePeriods.map( (item,i) => {
            let monthExpense = expensePeriods[i];
            return {
                start_date : item.start_date,
                income_actual : item.actual_amount + item.refund_amount,
                income_forecast : item.forecast_amount,
                expense_actual : monthExpense.actual_amount + monthExpense.refund_amount,
                expense_forecast : monthExpense.forecast_amount
            }
        })
    });   
};

const fetchScenarios = (id) => {
    let allAccounts = psfetch(apipath + '/users/' + id +'/accounts' )
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

const assembleData = () => {
    let userid = fetchID();

    let scenarios = userid
    .then(id => fetchScenarios(id));

    let categories = userid
    .then(id => {
        return fetchCategories(id);
    });
    
    return Promise.all([userid, categories, scenarios])
    .then(([id, catlist, scenlist]) =>
        Promise.all(
            catlist.map(val => {
                return fetchTrends(id, val.id, scenlist)
                .then(result => {
                    val.trends = result
                    return val
                })
            })
        )
    );
}

module.exports = {
    assembleData
};