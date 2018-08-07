
let updateChart1 = prepareChart(".chart", 960,500);
let updateChart2 = prepareChart(".diff", 960,250);

let dataAcc = []
let dataPer = []
let diffPer = []
let diffAcc = []

let updateChart = function() {
  let chartData = d3.select("#cumulative").property("checked") ? dataAcc : dataPer
  updateChart1(chartData)
  let diffData = d3.select("#cumulative").property("checked") ? diffAcc : diffPer
  updateChart2(diffData)
}

d3.select("#cumulative").on("change", updateChart);

d3.json("/totals/")
  .then(trends => {
    let output = {accum:[], period:[], diffAccum:[], diffPeriod:[] }
    
    trends.forEach((m,i,a) => {
      let start_date = parseDate(m.start_date);
      
      Object.keys(m).forEach(k => {
        if(k != "start_date")  {
          if(start_date < d3.timeMonth.offset(new Date(),1) || k.includes("forecast") )
          {
            output.period.push({start_date,type:k,value:m[k]})
            output.accum.push({start_date, type:k,
              value:m[k] + (i > 0? _.findLast(output.accum,e => e.type == k).value : 0)
            })
          }
        }
      })
      if(start_date < new Date() && new Date() < d3.timeMonth.offset(start_date,1)){
        output.accum.push({start_date, type:"income_forecast", value:null})
        output.accum.push({start_date, type:"income_forecast",
          value:_.findLast(output.accum,e => e.type == "income_actual").value
        })
        output.accum.push({start_date, type:"expense_forecast",value:null})        
        output.accum.push({start_date, type:"expense_forecast",
          value:_.findLast(output.accum,e => e.type == "expense_actual").value
        })
      }

      if(start_date < d3.timeMonth.offset(new Date(),1)){
        output.diffPeriod.push({start_date,type:"actual",
          value:m.income_actual - m.expense_actual})
        output.diffAccum.push({start_date, type:"actual", 
          value:(m.income_actual - m.expense_actual)+(i > 0? _.findLast(output.diffAccum,e => e.type == "actual").value : 0)})
      }
      output.diffPeriod.push({start_date,type:"forecast",
        value:m.income_forecast - m.expense_forecast})
      output.diffAccum.push({start_date, type:"forecast", 
        value:(m.income_forecast - m.expense_forecast)+(i > 0? _.findLast(output.diffAccum,e => e.type == "forecast").value : 0)})
      if(start_date < new Date() && new Date() < d3.timeMonth.offset(start_date,1)){
        output.diffAccum.push({start_date, type:"forecast", value:null})
        output.diffAccum.push({start_date, type:"forecast",
          value: _.findLast(output.diffAccum,e => e.type == "actual").value
        })        
      }
    })
    
    console.log(output)
      
    return output
  })   
  .then(function(allData) {
   
  dataAcc = d3.nest()
    .key(d => d.type)
    .entries(allData.accum)  

  dataPer = d3.nest()
    .key(d => d.type)
    .entries(allData.period)

  diffPer = d3.nest()
  .key(d => d.type)
  .entries(allData.diffPeriod)

  diffAcc = d3.nest()
  .key(d => d.type)
  .entries(allData.diffAccum)

  updateChart()
});

function parseDate(d) {return d3.timeMonth.offset(d3.utcParse('%Y-%m-%d')(d),1)}
