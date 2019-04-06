function prepareChart(selector, inWidth, inHeight) {
  var margin = { top: 20, right: 30, bottom: 60, left: 40 },
    width = inWidth - margin.left - margin.right,
    height = inHeight - margin.top - margin.bottom;

  var x = d3.scaleTime().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);

  let z = d3.scaleOrdinal(d3.schemeDark2);

  var xAxis = d3.axisBottom(x);
  var yAxis = d3.axisLeft(y).ticks(10, "s");

  var chart = d3
    .select(selector)
    .append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr(
      "viewBox",
      "0 0 " +
        (width + margin.left + margin.right) +
        " " +
        (height + margin.top + margin.bottom)
    )
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  y.domain([0, 300000]);

  chart
    .append("g")
    .attr("class", "yaxis")
    .call(yAxis);

  let months = d3.utcMonth.range(new Date(2018, 12, 1), new Date(2020, 1, 1));
  x.domain(d3.extent(months));

  chart
    .append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  return function update(data) {
    var t = d3
      .transition()
      .duration(750)
      .ease(d3.easeLinear);

    y.domain([
      d3.min(data, d => d3.min(d.values, e => e.value)),
      d3.max(data, d => d3.max(d.values, e => e.value))
    ]);

    chart
      .select(".yaxis")
      .transition(t)
      .call(yAxis);

    let line = d3
      .line()
      .x(d => x(d.start_date))
      .y(d => y(d.value))
      .defined(d => d.value !== null);

    let typegroups = chart.selectAll(".typegroup").data(data);

    typegroups = typegroups
      .enter()
      .append("g")
      .attr("class", "typegroup")
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .style("stroke", d => z(d.key))
      .merge(typegroups);

    let lines = typegroups.selectAll(".line").data(d => [d.values]);

    lines.exit().remove();

    lines
      .enter()
      .append("path")
      .attr("class", "line")
      .merge(lines)
      .transition(t)
      .attr("d", line);

    let circles = typegroups
      .selectAll("circle")
      .data(d => d.values.filter(e => e.value != null));

    circles.exit().remove();

    let allCircles = circles
      .enter()
      .append("circle")
      .attr("fill", d => z(d.type))
      .attr("r", 3)
      .merge(circles);

    allCircles
      .transition(t)
      .attr("cx", d => x(d.start_date))
      .attr("cy", d => y(d.value));

    allCircles.selectAll("title").remove();

    allCircles.append("svg:title").text(d => Math.round(d.value));

    let legendSpace = width / data.length;

    // Add the Legend
    chart
      .selectAll(".legend")
      .data(data)
      .enter()
      .append("text")
      .attr("x", (d, i) => legendSpace / 2 + i * legendSpace) // space legend
      .attr("y", height + margin.bottom / 2 + 5)
      .attr("class", "legend") // style the legend
      .style("fill", d => z(d.key))
      .text(d => d.key);
  };
}
