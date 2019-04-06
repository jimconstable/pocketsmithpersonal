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
        .format("YYYY-MM-DD"),
      expense_actual: 0,
      income_actual: 0,
      expense_forecast: 0,
      income_forecast: 0
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

const fetchBudgetTrends = (id, baseData, parameters) => {
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
      val.expense_forecast = expenseObject
        ? expenseObject.forecast_amount * -1
        : 0;
      return val;
    })
  );
};

const fetchActualTrends = (id, cats, accs, parameters) => {
  let baseData = periods(
    parameters.start_date,
    parameters.end_date,
    parameters.period,
    parameters.interval
  );

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
    page: page
  });

  return psfetch(trendUrl.toString()).then(trans => {
    let valladd = trans.reduce((total, next) => {
      if (
        next.category != null &&
        cats.includes(next.category.title) &&
        accs.includes(next.transaction_account.name) //&& !next.is_transfer
      ) {
        switch (next.category.refund_behaviour) {
          case null:
            if (next.amount > 0) {
              total.income_actual = total.income_actual + next.amount;
            } else {
              total.expense_actual = total.expense_actual - next.amount;
            }
            break;
          case "credits_are_refunds":
            total.expense_actual = total.expense_actual - next.amount;
            break;
          case "debits_are_deductions":
            total.income_actual = total.income_actual + next.amount;
            break;
          default:
            console.log(next.category);
        }
      }
      return total;
    }, val);

    if (trans.length == 30) {
      return MonthTransPage(id, cats, accs, valladd, page + 1);
    } else {
      return valladd;
    }
  });
}

const totalsOnly = () => {
  let start_date = "2019-01-01";
  let end_date = "2019-12-31";
  let period = "months";
  let interval = 1;

  let userid = fetchID();
  let accounts = fetchAccounts();
  let categories = userid.then(id => fetchCategories(id));

  let actuals = Promise.all([userid, categories, accounts]).then(
    ([id, cats, accs]) =>
      fetchActualTrends(id, cats.map(x => x.title), accs, {
        start_date,
        end_date,
        period,
        interval
      })
  );

  let scenarios = userid.then(id => fetchScenarios(id));

  //let forecasts =
  return Promise.all([userid, categories, scenarios, actuals]).then(
    ([id, catlist, scenlist, baseData]) => {
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

      return fetchBudgetTrends(id, baseData, params);
    }
  );
};

module.exports = { totalsOnly };
