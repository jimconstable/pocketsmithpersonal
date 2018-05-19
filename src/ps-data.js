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
        headers: {'Authorization':'Key ' + process.env.PSKEY}
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
    .then(trends => { 
        // let now = today()
        
        // let outputArr = []
        // if(trends.income != null) {
        //     trends.income.periods.forEach(a => {
        //         outputArr.push({
        //             type: "income_forecast",
        //             value: a.forecast_amount,
        //             start_date: a.start_date
        //         })
        //         if (a.start_date < now) {
        //         outputArr.push({
        //             type: "income_actual",
        //             value: a.actual_amount + a.refund_amount,
        //             start_date: a.start_date
        //         })}
        //     });
        // }

        // if(trends.expense != null) {
        //     trends.expense.periods.forEach(a => {
        //         outputArr.push({
        //             type: "expense_forecast",
        //             value: a.forecast_amount,
        //             start_date: a.start_date
        //         })
        //         if (a.start_date < now) {
        //         outputArr.push({
        //             type: "expense_actual",
        //             value: a.actual_amount + a.refund_amount,
        //             start_date: a.start_date
        //         })}
        //     });
        // }
        
        let incomePeriods =  (trends.income == null) ? periodbase : trends.income.periods
        let expensePeriods = (trends.expense == null) ? periodbase : trends.expense.periods
        
        return incomePeriods.map( (item,i) => {
            let monthExpense = expensePeriods[i];
            return {
                start_date : item.start_date,
                income_actual : item.actual_amount + item.refund_amount,
                income_forecast : item.forecast_amount,
                expense_actual : -(monthExpense.actual_amount + monthExpense.refund_amount),
                expense_forecast : -(monthExpense.forecast_amount)
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
    .then(totals => totals.reduce(
        (a,b,i) => {
            a.push(sumTrend(a[i], b,b.start_date))
            return a
        }
    , [{
        start_date : '2017-12-01',
        income_actual : 0,
        income_forecast : 0,
        expense_actual : 0,
        expense_forecast: 0 
        }]
    ));
}

const sumTrend = (t1,t2, start_date) => ({
    start_date : start_date,
    income_actual : t1.income_actual + t2.income_actual,
    income_forecast : t1.income_forecast + t2.income_forecast,
    expense_actual : t1.expense_actual + (t2.expense_actual === 0 ? null : t2.expense_actual),
    expense_forecast :t1.expense_forecast + t2.expense_forecast,
})

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

const today = () => {
    var todayDate = new Date();
    var dd = todayDate.getDate();
    var mm = todayDate.getMonth()+1; //January is 0!
    var yyyy = todayDate.getFullYear();

    if(dd<10) {
        dd = '0'+dd
    } 

    if(mm<10) {
        mm = '0'+mm
    } 

    return yyyy + '-' + mm + '-' + dd;
}

module.exports = { allCategories, totalsOnly };