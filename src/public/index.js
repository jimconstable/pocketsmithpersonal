
var margin = {top: 20, right: 30, bottom: 60, left: 40},
width = 960 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);    

let z = d3.scaleOrdinal(d3.schemeDark2)
  
var xAxis = d3.axisBottom(x);    
var yAxis = d3.axisLeft(y).ticks(15,"$");

let parseDate = (d) => d3.timeMonth.offset(d3.timeParse('%Y-%m-%d')(d),1)

var chart = d3.select(".chart")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

let data = []
let dataByType = []
let dataAcc = []
let dataPer =[]

d3.select("#cumulative").on("change",update);

d3.json("/totals/")
  .then(function(allData) {
  
  dataAcc = allData.map(d => ({start_date:parseDate(d.start_date), type : d.type, value : d.value}))  
  dataPer = allData
    .map(d => ({start_date:parseDate(d.start_date), type : d.type, value : d.delta}))
    .filter(d => d.value !== null)

  data = dataAcc

  x.domain([d3.min(dataAcc, d => d.start_date),d3.max(dataAcc,d => d.start_date)]);
  y.domain([0, 300000]); 

  chart.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  chart.append("g")
    .attr("class", "yaxis")
    .call(yAxis);

  update()
});

function update() {
  let acc = d3.select("#cumulative").property("checked")
  
  var t = d3.transition()
    .duration(750)
    .ease(d3.easeLinear);

  data = acc ? dataAcc : dataPer

  y.domain([0, d3.max(data,d => d.value)]);

  chart.select(".yaxis").transition(t)
     .call(yAxis);


  dataByType = d3.nest()
    .key(d => d.type)
    .entries(data)

  let line = d3.line()
    .x(d => x(d.start_date))
    .y(d => y(d.value))
    .defined(d => d.value != null)
  
  let typegroups = chart.selectAll(".typegroup")
    .data(dataByType)
   
  typegroups = typegroups.enter()
    .append("g")
    .attr("class","typegroup")
    .attr("fill", "none")
    .attr("stroke-width", 2)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .style("stroke", d => z(d.key))
    .merge(typegroups)
  
  let lines = typegroups.selectAll(".line")
    .data(d => [d.values])
  
  lines.exit().remove()
  
  lines.enter()
    .append("path")
    .attr("class","line")
    .merge(lines).transition(t).attr("d", line)
  
  let circles = typegroups.selectAll("circle")
      .data(d => d.values)
    
  circles.exit().remove()

  circles.enter()
     .append("circle")
     .attr("fill", d => z(d.type))
     .attr("r", 3)     
     .merge(circles)
     .transition(t)
     .attr("cx", d => x(d.start_date))
     .attr("cy", d => y(d.value))


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
  
}