const fetch = require("node-fetch");
const { URL, URLSearchParams } = require("url");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment");

const apipath = "https://api.pocketsmith.com/v2";

const psfetch = url =>
  fetch(url, {
    headers: { Authorization: "Key " + process.env.PSKEY }
  }).then(response => response.json());

//create all the periods between the start and end date including an extra period at the start for origin
function periods(start_date, end_date, period, interval) {
  let a = moment.utc(start_date);
  let b = moment.utc(end_date).add(1, "days");
  let result = [...Array(b.diff(a, period) + 1).keys()];
  return result.map(i => a.clone().add(interval * (i - 1), period)).map(val => {
    return {
      start_date: val.format("YYYY-MM-DD"),
      end_date: val
        .add(interval, period)
        .add(-1, "day")
        .format("YYYY-MM-DD")
    };
  });
}

const fetchID = () => psfetch(apipath + "/me").then(data => data.id);

const fetchScenarios = id => {
  let allScenarios = psfetch(apipath + "/users/" + id + "/accounts");
  let tranScenarios = fs.readJson(path.join(__dirname, "..", "accounts.json"));

  return Promise.all([allScenarios, tranScenarios]).then(
    ([allScen, transScen]) =>
      allScen.filter(item => transScen.includes(item.title))
  );
};

const fetchCategories = id => {
  let allCats = psfetch(apipath + "/users/" + id + "/categories").then(cats =>
    cats.reduce(catFlat, [])
  );
  let ignoreCats = fs.readJson(path.join(__dirname, "..", "categories.json"));

  return Promise.all([allCats, ignoreCats]).then(([allcat, ignorecat]) =>
    allcat.filter(item => !ignorecat.includes(item.title))
  );
};

const catFlat = (acc, val) => {
  let childs = val.children.reduce(catFlat, []);
  acc.push({ id: val.id, title: val.title, parent_id: val.parent_id });
  if (childs.length > 0) acc.push(...childs);
  return acc;
};

const fetchAccounts = () => {
  return fs.readJson(path.join(__dirname, "..", "accounts.json"));
};

const fetchBudgetTrends = (id, parameters) => {
  let baseData = periods(
    parameters.start_date,
    parameters.end_date,
    parameters.period,
    parameters.interval
  );

  let trendUrl = new URL(apipath + "/users/" + id + "/trend_analysis");

  trendUrl.search = new URLSearchParams(parameters);

  return psfetch(trendUrl.toString()).then(totals =>
    baseData.map(val => {
      let incomeObject = totals.income.periods.find(
        item => item.start_date == val.start_date
      );
      val.income_forecast = incomeObject ? incomeObject.forecast_amount : 0;
      let expenseObject = totals.expense.periods.find(
        item => item.start_date == val.start_date
      );
      val.expense_forecast = expenseObject ? expenseObject.forecast_amount : 0;
      return val;
    })
  );
};

const fetchActualTrends = (id, cats, accs,  parameters) => {
  let baseData = periods(
    parameters.start_date,
    parameters.end_date,
    parameters.period,
    parameters.interval
  );  
console.log(cats,accs)
  return Promise.all(
    baseData.map((val, i) => {
      if (i == 0) return val;
      return MonthTransPage(id, cats, accs, val);
    })
  );
};

function MonthTransPage(id, cats, accs, val, page = 1) {
    let trendUrl = new URL(apipath + "/users/" + id + "/transactions");
    trendUrl.search = new URLSearchParams({
        start_date: val.start_date,
        end_date: val.end_date,
        page : page 
    });

    return psfetch(trendUrl.toString())
    .then(trans => {
        console.log(val.start_date, ":", trans.length);
        let valladd =  trans.reduce((total, next) => {
            if ((next.category === null || cats.includes(next.category.title))
            && (accs.includes(next.transaction_account.name)))
            {
                if (next.amount > 0) {
                    total.income_actual = (total.income_actual || 0) + next.amount;
                }
                else {
                    total.expense_actual = (total.expense_actual || 0) - next.amount;
                }
            }
            return total;
        }, val)
        
        if(trans.length == 30 ){
            return MonthTransPage(id, cats, accs, valladd,page+1)
        }
        else{
            return valladd;
        }
    });
}



const test = () => {
  let start_date = "2018-01-01";
  let end_date = "2018-12-31";
  let period = "months";
  let interval = 1;

  let userid = fetchID();
  let accounts = fetchAccounts();
  let categories = userid
    .then(id => fetchCategories(id));  

  return Promise.all([userid,categories,accounts])
    .then(([id, cats, accs]) =>
      fetchActualTrends(id, cats.map(x => x.title), accs, { start_date, end_date, period, interval })
    );
   
  // let scenarios =
  //     userid.then(id => fetchScenarios(id));

  

  // //let forecasts =
  // return Promise.all([userid, categories, scenarios])
  //  .then(([id, catlist, scenlist]) =>{

  //     let cats = catlist.reduce((acc,val)=>
  //         acc + (acc === '' ? '' : ',') + val.id,'')

  //     let scens = scenlist.reduce((acc, val) =>
  //         acc + (acc === '' ? '' : ',' ) + val.primary_scenario.id,'')

  //         const params = {
  //             categories: cats,
  //             scenarios: scens,
  //             start_date,
  //             end_date,
  //             period,
  //             interval
  //         };

  //     return fetchBudgetTrends(id, params)
  // });


  // return Promise.all([userid, categories, accounts, forecasts])
  //     .then(([id, catlist, acclist, fore]) =>{
  //         return fore;
  //     });
};

const periodbase = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12"
].map(item => ({
  start_date: "2018-" + item + "-01",
  actual_amount: 0,
  refund_amount: 0,
  forecast_amount: 0
}));

const fetchTrends = (id, parameters) => {
  let trendUrl = new URL(apipath + "/users/" + id + "/trend_analysis");

  trendUrl.search = new URLSearchParams(parameters);

  return psfetch(trendUrl.toString()).then(totals => {
    let incomePeriods = totals.income.periods || periodbase;
    let expensePeriods = totals.expense.periods || periodbase;
    return incomePeriods.reduce(
      (a, b, i) => {
        a.push({
          start_date: b.start_date,
          income_actual: b.actual_amount + b.refund_amount,
          income_forecast: b.forecast_amount,
          expense_actual:
            -1 *
            (expensePeriods[i].actual_amount + expensePeriods[i].refund_amount),
          expense_forecast: -1 * expensePeriods[i].forecast_amount
        });
        return a;
      },
      [
        {
          start_date: "2017-12-01",
          income_actual: 0,
          income_forecast: 0,
          expense_actual: 0,
          expense_forecast: 0
        }
      ]
    );
  });
};

const totalsOnly = () => {
  let start_date = "2018-01-01";
  let end_date = "2018-12-31";
  let period = "months";
  let interval = 1;

  let userid = fetchID();

  let scenarios = userid.then(id => fetchScenarios(id));

  let categories = userid.then(id => fetchCategories(id));

  let forecasts = Promise.all([userid, categories, scenarios]).then(
    ([id, catlist, scenlist]) => {
      let cats = catlist.reduce(
        (acc, val) => acc + (acc === "" ? "" : ",") + val.id,
        ""
      );

      let scens = scenlist.reduce(
        (acc, val) => acc + (acc === "" ? "" : ",") + val.primary_scenario.id,
        ""
      );

      const params = {
        categories: cats,
        scenarios: scens,
        start_date,
        end_date,
        period,
        interval
      };

      return fetchTrends(id, params);
    }
  );

  let accounts = fetchAccounts();

  return Promise.all([userid, categories, accounts, forecasts]).then(
    ([id, catlist, acclist, fore]) => {
      return fore;
    }
  );
};

const allCategories = () => {
  let userid = fetchID();

  let scenarios = userid.then(id => fetchScenarios(id));

  let categories = userid.then(id => fetchCategories(id));

  return Promise.all([userid, categories, scenarios]).then(
    ([id, catlist, scenlist]) =>
      Promise.all(
        catlist.map(val =>
          fetchTrends(id, val.id, scenlist).then(result => {
            val.trends = result;
            return val;
          })
        )
      )
  );
};

const listCategories = () => {
  let userid = fetchID();

  // let scenarios = userid
  // .then(id => fetchScenarios(id));

  let categories = userid.then(id => fetchCategories(id));

  return categories;
};

module.exports = { test, allCategories, totalsOnly, listCategories };

