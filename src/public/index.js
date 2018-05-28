
function prepareChart(selector, inWidth, inHeight) {
  var margin = {top: 20, right: 30, bottom: 60, left: 40},
  width = inWidth - margin.left - margin.right,
  height = inHeight - margin.top - margin.bottom;

  var x = d3.scaleTime().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);    

  let z = d3.scaleOrdinal(d3.schemeDark2)
    
  var xAxis = d3.axisBottom(x);    
  var yAxis = d3.axisLeft(y).ticks(15,"$");

  var chart = d3.select(selector)
    .append("svg")
    // .attr("width", width + margin.left + margin.right)
    // .attr("height", height + margin.top + margin.bottom)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  y.domain([0, 300000]); 
  
  chart.append("g")
    .attr("class", "yaxis")
    .call(yAxis);

  let months = d3.utcMonth.range(new Date(2017,12,01), new Date(2019,01,01))
  x.domain(d3.extent(months));
  
  chart.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  return function update(data) {
      
      var t = d3.transition()
        .duration(750)
        .ease(d3.easeLinear);
    
      y.domain([0, d3.max(data,d => 
        d3.max(d.values,e => e.value)
      )]);
    
      chart.select(".yaxis")
        .transition(t)
        .call(yAxis);
      
      let line = d3.line()
        .x(d => x(d.start_date))
        .y(d => y(d.value))
        .defined(d => d.value != null)
      
      let typegroups = chart.selectAll(".typegroup")
        .data(data)
       
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
    
      let legendSpace = width/data.length;
    
        // Add the Legend
      chart.selectAll(".legend")
          .data(data)
          .enter()
          .append("text")
          .attr("x", (d,i) => (legendSpace/2)+i*legendSpace)  // space legend
          .attr("y", height + (margin.bottom/2)+ 5)
          .attr("class", "legend")    // style the legend
          .style("fill", d => z(d.key))
          .text(d => d.key);   
    }
}

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

