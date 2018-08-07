const fetch = require('node-fetch');
const { URL, URLSearchParams } = require('url');
const fs = require("fs-extra");
const path  = require('path');

const apipath = 'https://api.pocketsmith.com/v2'

const periodbase = ['01','02','03','04','05','06','07','08','09','10','11','12'] 
.map( item => ({ 
        start_date: '2018-' + item + '-01', 
        actual_amount : 0, 
        refund_amount : 0, 
        forecast_amount : 0 
    })) 

const psfetch = url => 
    fetch(url, {
        headers: {'Authorization':'Key ' + process.env.PSKEY}
    })
    .then(response => response.json());

const fetchID = () => 
    psfetch(apipath + '/me')
    .then(data => data.id);

const fetchCategories = (id) => {
    let allCats =  psfetch(apipath + '/users/' + id +'/categories'  )
        .then(cats => cats.reduce(catConCat,[]));
    let ignoreCats = fs.readJson(path.join(__dirname, '..', 'categories.json'));
    
    return Promise.all([allCats, ignoreCats])
        .then(([allcat, ignorecat])=>
           allcat.filter(item => !ignorecat.includes(item.title))
        )
    
}

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
   
    const newLocal = {
        categories: catlist,
        scenarios: scenlist,
        start_date: '2018-01-01',
        end_date: '2018-12-31',
        period: 'months',
        interval: 1
    };
    trendUrl.search = new URLSearchParams(newLocal);
    
    return psfetch(trendUrl.toString())
    .then(totals => {
        let incomePeriods = (totals.income.periods || periodbase)
        let expensePeriods = (totals.expense.periods || periodbase)
        return incomePeriods.reduce(
            (a,b,i) => {
                a.push({start_date: b.start_date,
                    income_actual : b.actual_amount + b.refund_amount,
                    income_forecast : b.forecast_amount,
                    expense_actual : -1*(expensePeriods[i].actual_amount + expensePeriods[i].refund_amount),
                    expense_forecast: -1*(expensePeriods[i].forecast_amount) })
                return a
            }
            , [{
                start_date : '2017-12-01',
                income_actual : 0,
                income_forecast : 0,
                expense_actual : 0,
                expense_forecast: 0 
            }]
        )
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

const totalsOnly = () =>{
    let userid = fetchID();

    let scenarios = userid
    .then(id => fetchScenarios(id));

    let categories = userid
    .then(id => fetchCategories(id));
    
    return Promise.all([userid, categories, scenarios])
    .then(([id, catlist, scenlist]) =>{
        let cats = catlist.reduce((acc,val)=>
            acc + (acc === '' ? '' : ',') + val.id,'')    
        return fetchTrends(id, cats, scenlist)
    })
}

const allCategories = () => {
    let userid = fetchID();

    let scenarios = userid
    .then(id => fetchScenarios(id));

    let categories = userid
    .then(id => fetchCategories(id));
    
    return Promise.all([userid, categories, scenarios])
    .then(([id, catlist, scenlist]) =>
        Promise.all(catlist.map(val => 
            fetchTrends(id, val.id, scenlist)
            .then(result => {
                val.trends = result
                return val
            })
        ))
    );
}

const listCategories = () => {
    let userid = fetchID();

    // let scenarios = userid
    // .then(id => fetchScenarios(id));

    let categories = userid
    .then(id => fetchCategories(id));
    
    return categories;
}

module.exports = { allCategories, totalsOnly, listCategories };