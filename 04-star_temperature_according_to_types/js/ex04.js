const ctx = {
    CHART_WIDTH: 1280,
    CHART_HEIGHT: 720,
    JITTER_W:50,
    TEMP_COLOR_RANGE: ["#ed1b25", "#fff200", "#ffffff", "#00aeef", "#525ccc"],
    TEMP_COLOR_DOMAIN: [3200, 6000, 9000, 15000, 32000]
};

const margin = {top: 30, right: 30, bottom: 30, left: 50};
const spectralTypes = ['O', 'B', 'A', 'F', 'G', 'K', 'M', 'All'];
const height = ctx.CHART_HEIGHT - margin.top - margin.bottom;


// code for Section 4 (optional)
// data = array of stars with their attributes
// sG = d3 reference to the <g> element
//      for the corresponding spectral type
function densityPlot(data, sG){
    let effTs = data.map(function (p) { return p.Teff; });
    let effTScale = d3.scaleLinear()
                             .domain(/*some domain*/)
                             .range(/*some range*/);
    let n = effTs.length,
        density = kernelDensityEstimator(kernelEpanechnikov(7), effTScale.ticks(50))(effTs);
    let maxDensity = d3.max(density, (d) => (d[1]));
    let densityScale = d3.scaleLinear()
        .domain([0, maxDensity])
        .range([0, ctx.JITTER_W * 0.8]);
    // remove entries where y=0 to avoid unnecessarily-long tails
    let i = density.length - 1;
    let lastNonZeroBucket = -1;
    while (i >= 0) {
        // walk array backward, find last entry >0 at index n, keep n+1
        if (density[i][1] > 0) {
            lastNonZeroBucket = i;
            break;
        }
        i--;
    }
    if (lastNonZeroBucket != -1) {
        density = density.splice(0, lastNonZeroBucket + 3);
    }
    // insert a point at 0,0 so that the path fill does not cross the curve
    density.unshift([0, 0]);
    // now draw the density curve
    // TBW ...
};

// Initialize the y-axis
function initYAxis(data) {
    
    let yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Teff)])
    .range([height, 0]); 

    let yAxis = d3.axisLeft(yScale)
        .ticks(10)
        .tickFormat(d => `${d}K`);
    
    d3.select("#decoG").append("g").attr("id", "yAxis")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .call(yAxis); 

    console.log("Y-axis initialized");
    return yScale;
}

function initXAxis() {

    let groupSpacing = (ctx.CHART_WIDTH - margin.left - margin.right) / (spectralTypes.length + 1);
    spectralTypes.forEach((type, i) => {
        d3.select("#mainG")
            .append("g")
            .attr("id", `group-${type}`)  
            .attr("transform", `translate(${i * groupSpacing + margin.left + groupSpacing}, ${ctx.CHART_HEIGHT - margin.bottom})`)
            .append("text")
            .attr("text-anchor", "middle")
            .attr("fill", "white") 
            .text(type + ' type');    
    });

    console.log("X-axis initialized");
}


function drawStars(data, yScale) {
    const colorScale = d3.scaleLinear()
        .domain(ctx.TEMP_COLOR_DOMAIN)
        .range(ctx.TEMP_COLOR_RANGE);
    
    spectralTypes.forEach(type => {
        const group = d3.select(`#group-${type}`);

        const starsOfType = (type != 'All') ? data.filter(star => star.SpType_ELS.trim() == type) : data;

        group.selectAll("circle")
            .data(starsOfType)
            .enter()
            .append("circle")
            .attr("cx", (d) => Math.random() * 30-15)
            .attr("cy", (d) => yScale(d.Teff) - height)
            .attr("r", 1)
            .attr("fill", (d) => colorScale(d.Teff));
    });

    console.log("Stars drawn");
}

function drawBoxPlots(data, yScale) {

    spectralTypes.forEach(type => {
        const group = d3.select(`#group-${type}`);
        
        const starsOfType = (type != 'All') ? data.filter(star => star.SpType_ELS.trim() == type) : data;

        const summaryStats = getSummaryStatistics(starsOfType);

        const { q1, median, q3, iqr, min, max } = summaryStats;

        const yMedian = yScale(median) - height
        const yQ1 = yScale(q1) - height
        const yQ3 = yScale(q3) - height
        const yMin = yScale(min) - height
        const yMax = yScale(max) - height

        // Draw the interquartile range box
        group.append("rect")
            .datum(summaryStats) 
            .attr("x", -40) 
            .attr("y", yQ3) 
            .attr("width", 80) 
            .attr("height", yQ1 - yQ3) 
            .attr("fill", "none")
            .attr("stroke", "white"); 

        // Draw the median line inside the box
        group.append("line")
            .datum(summaryStats) 
            .attr("x1", -40)
            .attr("x2", 40)
            .attr("y1", yMedian) 
            .attr("y2", yMedian)
            .attr("stroke", "white")

        // Draw whiskers (min and max)
        // Min whisker
        group.append("line")
            .datum(summaryStats)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", yMin)
            .attr("y2", yQ1)
            .attr("stroke", "white");
        group.append("line")
            .datum(summaryStats) 
            .attr("x1", -20)
            .attr("x2", 20)
            .attr("y1", yMin) 
            .attr("y2", yMin)
            .attr("stroke", "white");

        // Max whisker
        group.append("line")
            .datum(summaryStats)
            .attr("x1", 0) 
            .attr("x2", 0)
            .attr("y1", yMax) 
            .attr("y2", yQ3)
            .attr("stroke", "white");
        group.append("line")
            .datum(summaryStats) 
            .attr("x1", -20)
            .attr("x2", 20)
            .attr("y1", yMax) 
            .attr("y2", yMax)
            .attr("stroke", "white");
    });
}

function loadData() {
    d3.csv("data/sample_gaia_DR3_2024.csv").then(function (data) {
        let starsWithTeff = data.filter((d) => (parseFloat(d.Teff) > 0));
        starsWithTeff.forEach(
            (d) => { d.Teff = parseFloat(d.Teff); }
        );
        console.log(`Stars with estimated temperature: ${starsWithTeff.length}`);

        const yScale = initYAxis(starsWithTeff);

        initXAxis();

        drawStars(starsWithTeff, yScale);

        drawBoxPlots(starsWithTeff, yScale);
        
    }).catch(function(error){console.log(error)});
};

function createViz(){
    console.log("Using D3 v"+d3.version);
    var svgEl = d3.select("#main").append("svg");
    svgEl.attr("width", ctx.CHART_WIDTH);
    svgEl.attr("height", ctx.CHART_HEIGHT);
    var mainG = svgEl.append("g").attr("id", "mainG");
    // group for background elements (axes, labels)
    mainG.append("g").attr("id", "decoG");
    loadData();
};

/*-------------- Summary stats for box plot ------------------------*/
/*-------------- see Instructions/Section 3 ----------------------*/

function getSummaryStatistics(data) {
    return d3.rollup(data, function (d) {
        let q1 = d3.quantile(d.map(function (p) { return p.Teff; }).sort(d3.ascending), .25);
        let median = d3.quantile(d.map(function (p) { return p.Teff; }).sort(d3.ascending), .5);
        let q3 = d3.quantile(d.map(function (p) { return p.Teff; }).sort(d3.ascending), .75);
        let iqr = q3 - q1;
        let min = d3.min(data, (d) => (d.Teff));
        let max = d3.max(data, (d) => (d.Teff));
        return ({ q1: q1, median: median, q3: q3, iqr: iqr, min: min, max: max })
    });
};

/*-------------- kernel density estimator ------------------------*/
/*-------------- see Instructions/Section 4 ----------------------*/

function kernelDensityEstimator(kernel, X) {
  return function(V) {
    return X.map(function(x) {
      return [x, d3.mean(V, function(v) { return kernel(x - v); })];
    });
  };
}

function kernelEpanechnikov(k) {
  return function(v) {
    return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  };
}
