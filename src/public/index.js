
var margin = {top: 20, right: 30, bottom: 60, left: 40},
width = 960 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);    

let z = d3.scaleOrdinal(d3.schemeDark2)
  
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
  y.domain([0, d3.max(data,d => d.value)]);

let dataByType = d3.nest()
    .key(d => d.type)
    .entries(data)  
  
    console.log(dataByType)

let line = d3.line()
  .x(d => x(parseDate(d.start_date)))
  .y(d => y(d.value))
  .defined(d => d .value !== null)

chart.append("g")
  .attr("class", "x axis")
  .attr("transform", "translate(0," + height + ")")
  .call(xAxis);

chart.append("g")
  .attr("class", "y axis")
  .call(yAxis);

let typegroups = chart.selectAll(".typegroup")
  .data(dataByType)
  .enter()
  .append("g")
  .attr("class","typegroup")
  .attr("fill", "none")
  .attr("stroke-width", 2)
  .attr("stroke-linejoin", "round")
  .attr("stroke-linecap", "round")
  .style("stroke", d => z(d.key))

typegroups
  .append("path")
  .attr("d", d => line(d.values))
  .attr("class","line")

  legendSpace = width/dataByType.length;

  // Add the Legend
  chart.selectAll(".legend")
  .data(dataByType)
  .enter()
  .append("text")
  .attr("x", (d,i) => (legendSpace/2)+i*legendSpace)  // space legend
  .attr("y", height + (margin.bottom/2)+ 5)
  .attr("class", "legend")    // style the legend
  .style("fill", d => z(d.key))
  .text(d => d.key);   

});
