
let updateChart1 = prepareChart(".chart", 960,500);
let updateChart2 = prepareChart(".diff", 960,250);

let dataAcc = []
let dataPer = []

let updateChart = function() {
  chartData = d3.select("#cumulative").property("checked") ? dataAcc : dataPer
  updateChart1(chartData)
  updateChart2([])
}

d3.select("#cumulative").on("change", updateChart);

d3.json("/totals/")
  .then(trends => {               
    let outputArr = []
    if(trends.income != null) {
        let incomes = cumulativeAmounts(trends.income.periods,a => a, "income")
        outputArr.push(...incomes.a)
        outputArr.push(...incomes.f)
    }
    if(trends.expense != null) {
        let expenses = cumulativeAmounts(trends.expense.periods,(a) => -a, "expense")
        outputArr.push(...expenses.a)
        outputArr.push(...expenses.f)
    }
    return outputArr
  })   
  .then(function(allData) {
   
  let parseDate = (d) => d3.timeMonth.offset(d3.timeParse('%Y-%m-%d')(d),1)
 
  let dataAcc1 = allData
    .map(d => ({start_date:parseDate(d.start_date), type : d.type, value : d.value}))  
  dataAcc = d3.nest()
    .key(d => d.type)
    .entries(dataAcc1)  

  dataPer1 = allData
    .map(d => ({start_date:parseDate(d.start_date), type : d.type, value : d.delta}))
    .filter(d => d.value !== null)
  
  dataPer = d3.nest()
    .key(d => d.type)
    .entries(dataPer1)

  updateChart()
});




const cumulativeAmounts = (arr, convert, prefix ) => {
  return arr.reduce((d,item) => {
      if (item.start_date < aDate(0) ) {
          d.a.push({
              start_date : item.start_date, 
              type: d.a[d.a.length-1].type, 
              value: d.a[d.a.length-1].value + convert(item.actual_amount + item.refund_amount),
              delta: convert(item.actual_amount + item.refund_amount)
          })
      }
      d.f.push({
          start_date : item.start_date, 
          type: d.f[d.f.length-1].type, 
          value: d.f[d.f.length-1].value + convert(item.forecast_amount),
          delta: convert(item.forecast_amount)
      })
      if (item.start_date < aDate(-1) && item.end_date > aDate(-1)){
          d.f.push({
              start_date : item.start_date, 
              type: d.f[d.f.length-1].type, 
              value: null,
              delta: null
          })
          d.f.push({
              start_date : item.start_date, 
              type: d.f[d.f.length-1].type, 
              value: d.a[d.a.length-1].value,
              delta: null
          })
      }
      return d
  },
      {a: [{start_date: '2017-12-01', type: prefix + "_actual", value:0, delta:0}],
      f: [{start_date: '2017-12-01', type: prefix + "_forecast", value:0, delta:0}]}
  )
}


const aDate = (x) => {
  var todayDate = new Date();
  var dd = todayDate.getDate();
  var mm = todayDate.getMonth() + 1 + x; //January is 0!
  var yyyy = todayDate.getFullYear();

  if(dd<10) {
      dd = '0'+dd
  } 

  if(mm<10) {
      mm = '0'+mm
  } 

  return yyyy + '-' + mm + '-' + dd;
}