
var margin = {top: 20, right: 30, bottom: 30, left: 40},
width = 960 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);    

var xAxis = d3.axisBottom(x);    
var yAxis = d3.axisLeft(y).ticks(15,"$");

var chart = d3.select(".chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

let parseDate = (d) => d3.timeMonth.offset(d3.timeParse('%Y-%m-%d')(d),1)

d3.json("/totals/")
.then(function(data) {
  x.domain([d3.min(data, d => parseDate(d.start_date)),d3.max(data,d => parseDate(d.start_date))]);
  y.domain([0, 250000]);

let line = d3.line()
  .x(d => x(parseDate(d.start_date)))
  .y(d => y(d.expense_actual))
  
let line2 = d3.line()
  .x(d => x(parseDate(d.start_date)))
  .y(d => y(d.expense_forecast))

let line3 = d3.line()
  .x(d => x(parseDate(d.start_date)))
  .y(d => y(d.income_forecast))

let line4 = d3.line()
  .x(d => x(parseDate(d.start_date)))
  .y(d => y(d.income_actual))

  chart.append("g")
  .attr("class", "x axis")
  .attr("transform", "translate(0," + height + ")")
  .call(xAxis);

chart.append("g")
  .attr("class", "y axis")
  .call(yAxis);

chart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0-margin.left)
    .attr("x", 0-(height/2))
    .attr("dy", ".71em")
    .style("text-anchor", "middle")
    .text("Frequency");
  
chart.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "green")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 2)
    .attr("d", line)

chart.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "purple")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 2)
    .attr("d", line2)

chart.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 2)
    .attr("d", line3)

    chart.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 2)
    .attr("d", line4)
});
