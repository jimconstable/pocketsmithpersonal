
var margin = {top: 20, right: 30, bottom: 30, left: 40},
width = 960 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

var y = d3.scaleLinear()
    .range([height, 0]);
    
var x = d3.scaleBand()
.rangeRound([0, width]).padding(.1);

var xAxis = d3.axisBottom(x);
    
var yAxis = d3.axisLeft(y).ticks(10,"%");

var chart = d3.select(".chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.json("/totals/", type)
.then(function(data) {
  x.domain(data.map(function(d) { return d.name; }));
  y.domain([0, d3.max(data, function(d) { return d.value; })]);

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
  
chart.selectAll(".bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return x(d.name); })
    .attr("y", function(d) { return y(d.value); })
    .attr("height", function(d) { return height - y(d.value); })
    .attr("width", x.bandwidth());

  
});

function type(d) {
  d.value = +d.value; // coerce to number
  return d;
}