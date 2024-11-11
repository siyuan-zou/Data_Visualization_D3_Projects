const ctx = {
    REFERENCE_YEAR: "2010", // year used as a reference, between 1948 and 2021
    w: 1200,
    h: 900,
    GREY_NULL: "#333",
    STAGE_DURATION: 1000,
    DOUBLE_CLICK_THRESHOLD: 320,
    totalStripPlotHeight: 420,
    totalLinePlotHeight: 900,
    vmargin: 2,
    hmargin: 4,
    timeParser: d3.timeParse("%Y-%m-%d"),
    yearAxisHeight: 20,
    linePlot: false,
    crossSeriesTempExtent: [0, 0],
};

// The column names of CITY_NAMES to be exctracted from the dataset
const CITY_NAMES = ["boston", "new_york", "los_angeles", "anchorage", "dallas", "miami", "honolulu", "las_vegas", "phoenix", "new_orleans", "san_francisco", "seattle", "sacramento", "reno", "portland", "oklahoma_city", "memphis", "minneapolis", "kansas_city", "detroit", "denver", "albuquerque", "atlanta"];

function transformData(data) {
    let temperatureSeries = { dates: [], series: [] };
    ctx.cityRefTemps = {};
    let cityDeltaTemps = {};
    CITY_NAMES.forEach(
        function (c) {
            ctx.cityRefTemps[c] = [];
            cityDeltaTemps[c] = [];
        }
    );
    data.filter((d) => (d.time.startsWith(ctx.REFERENCE_YEAR))).forEach(
        function (date_record) {
            CITY_NAMES.forEach(
                function (c) {
                    ctx.cityRefTemps[c].push(parseFloat(date_record[c]));
                }
            );
        }
    );
    data.forEach(
        function (date_record) {
            temperatureSeries.dates.push(date_record.time);
            CITY_NAMES.forEach(
                function (city) {
                    let delta = parseFloat(date_record[city]) - getReferenceTemp(city, getMonth(date_record.time));
                    cityDeltaTemps[city].push(delta);
                }
            );
        }
    );
    CITY_NAMES.forEach(
        function (c) {
            temperatureSeries.series.push({ name: c, values: cityDeltaTemps[c] });
        }
    );
    return temperatureSeries;
};

function createStrips(data, svgEl) {
    ctx.crossSeriesTempExtent = [d3.min(data.series,
        (d) => (d3.min(d.values))),
    d3.max(data.series,
        (d) => (d3.max(d.values)))];
    ctx.color = d3.scaleLinear()
        .domain([ctx.crossSeriesTempExtent[0],
            0,
        ctx.crossSeriesTempExtent[1]])
        .range(["rgb(0, 51, 255)", "#f5f5f5", "rgb(255, 57, 57)"]);
    ctx.STRIP_H = (ctx.totalStripPlotHeight - ctx.yearAxisHeight) / data.series.length;
    // for each band (city temperature time-series)
    data.series.forEach(function (s, i) {
        // create a <g> and put it in the right place
        // so that bands are juxtaposed vertically
        let mapG = svgEl.append("g")
            .classed("plot", true)
            .attr("transform",
                `translate(${ctx.hmargin},${i * ctx.STRIP_H})`);
        // populate each band with vertical lines,
        // one for each temperature value in the series
        // (a line corresponds to a month of a year)
        // the line being colored according to the value for that month-year
        mapG.selectAll("line")
            .data(s.values)
            .enter()
            .append("line")
            .attr("x1", (d, j) => (j))
            .attr("y1", ctx.vmargin)
            .attr("x2", (d, j) => (j))
            .attr("y2", ctx.STRIP_H - ctx.vmargin)
            .attr("stroke", (d) => ((d == null) ? ctx.GREY_NULL : ctx.color(d)));
        // add the city name after the color map
        mapG.append("text")
            .attr("x", data.dates.length + 2 * ctx.hmargin)
            .attr("y", ctx.STRIP_H - ctx.vmargin - 3)
            .text(formatCity(s.name));
    });
    // time axis
    let timeScale = d3.scaleTime()
        .domain(d3.extent(data.dates, (d) => ctx.timeParser(d)))
        .rangeRound([0, data.dates.length - 1]);
    svgEl.append("g")
        .attr("id", "yearAxis")
        .attr("transform",
            `translate(${ctx.hmargin},${ctx.totalStripPlotHeight - ctx.yearAxisHeight})`)
        .call(d3.axisBottom(timeScale).ticks(d3.timeYear.every(5)));
    // legend
    let tempRange4legend = d3.range(ctx.crossSeriesTempExtent[0],
                                    ctx.crossSeriesTempExtent[1], .15).reverse();
    let scale4tempLegend = d3.scaleLinear()
                             .domain(ctx.crossSeriesTempExtent)
                             .rangeRound([tempRange4legend.length, 0]);
    let legendG = svgEl.append("g")
                       .attr("id", "tempScale")
                       .attr("opacity", 1)
                       .attr("transform",
                             `translate(1000,${ctx.totalStripPlotHeight / 2 - tempRange4legend.length / 2})`);
    legendG.selectAll("line")
        .data(tempRange4legend)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("y1", (d, j) => (j))
        .attr("x2", ctx.STRIP_H)
        .attr("y2", (d, j) => (j))
        .attr("stroke", (d) => (ctx.color(d)));
    legendG.append("g")
        .attr("transform", `translate(${ctx.STRIP_H + 4},0)`)
        .call(d3.axisRight(scale4tempLegend).ticks(5));
    legendG.append("text")
        .attr("x", 40)
        .attr("y", tempRange4legend.length / 2)
        .style("fill", "#aaa")
        .text(`(Reference: ${ctx.REFERENCE_YEAR})`);
};

function fromColorStripsToLinePlots() {
    // Step 1.1: make the legend (temperature scale) fade out (just play on the group’s opacity);
    console.log(d3.select("#tempScale").node());
    let legendG = d3.select("#tempScale");
    legendG.transition()
            .duration(1000) // 1 second
            .attr("opacity", 0);
    
    // Step 1.2: then, translate all color strips, labels, as well as the time axis to fill the entire height of the SVG canvas (900px);

    let numCities = CITY_NAMES.length;
    let newStripHeight = (ctx.h - ctx.yearAxisHeight) / numCities;

    let svgEl = d3.select("#main").select("svg");
    svgEl.selectAll(".plot")
        .transition().delay(1000)
        .duration(1000)
        .attr("transform", (d, i) => `translate(${ctx.hmargin}, ${i * newStripHeight})`)
        .selectAll("line")
        .attr("y2", ctx.STRIP_H - ctx.vmargin) // Adjust line height within each strip
        .attr("y1", ctx.vmargin);
    
    svgEl.select("#yearAxis")
        .transition().delay(1000)
        .duration(1000)
        .attr("transform", `translate(${ctx.hmargin}, ${ctx.h - ctx.yearAxisHeight})`);
    
    

    // Step 1.3: then, make all strips 1px tall;
    svgEl.selectAll(".plot")
        .transition().delay(2000)
        .duration(1000)
        .attr("transform", (d, i) => `translate(${ctx.hmargin}, ${i * newStripHeight})`)
        .selectAll("line")
        .attr("y1", 0)
        .attr("y2", 1);
    
    // Step 1.4: then, turn all lines dark gray;
    svgEl.selectAll(".plot")
        .transition().delay(3000)
        .duration(1000)
        .selectAll("line")
        .attr("stroke", ctx.GREY_NULL);

    // Step 1.5: then, adjust each <line>’s y-coordinates based on the datum it is bound to (temperature difference with the year 1950 baseline).
    let yScale = d3.scaleLinear()
        .domain(ctx.crossSeriesTempExtent)  
        .range([newStripHeight - ctx.vmargin, ctx.vmargin]);         
    
    svgEl.selectAll(".plot")
        .selectAll("line")
        .transition().delay((d, i) => 4000 + i * 5)
        .duration(1000)
        .attr("y1", (d) => yScale(d))
        .attr("y2", (d) => yScale(d) + 1);
    
    // Step 1.6: once your transition works, introduce delay between the animation of each <line> of a strip in Step 1.5. This literally involves adding one line of code in the right place. Refer to INF552-2023-PC-slides-s05.pdf slide #3.

};

function fromLinePlotsToColorStrips() {
    // let numCities = CITY_NAMES.length;
    // let newStripHeight = (ctx.h - ctx.yearAxisHeight) / numCities;
    
    // Make them return to strip
    let svgEl = d3.select("#main").select("svg");
    svgEl.selectAll(".plot")
        .selectAll("line")
        .transition()
        .delay((d, i) => i * 5)
        .duration(1000)
        .attr("y1", ctx.vmargin)
        .attr("y2", ctx.STRIP_H - ctx.vmargin)
        .attr("stroke", (d) => ((d == null) ? ctx.GREY_NULL : ctx.color(d)))
        .on("end", function(d, i, nodes) {
            if (i === nodes.length - 1) {
            // Make them shrink back
            svgEl.selectAll(".plot")
                .transition()
                .duration(1000)
                .attr("transform", (d, i) => `translate(${ctx.hmargin}, ${i * ctx.STRIP_H})`);

            svgEl.select("#yearAxis")
            .transition()
            .duration(1000)
            .attr("transform",
                `translate(${ctx.hmargin},${ctx.totalStripPlotHeight - ctx.yearAxisHeight})`)
                    .on("end", function() {
                        // Temp Scale fade in
                        let legendG = d3.select("#tempScale");
                        legendG.transition()
                                .duration(1000) // 1 second
                                .attr("opacity", 1);
                    });
                }});

    
};

function toggleVis() {
    if (ctx.linePlot) {
        fromLinePlotsToColorStrips();
    }
    else {
        fromColorStripsToLinePlots();
    }
    ctx.linePlot = !ctx.linePlot;
};

function createViz() {
    console.log("Using D3 v" + d3.version);
    let svgEl = d3.select("#main").append("svg");
    svgEl.attr("width", ctx.w);
    svgEl.attr("height", ctx.h);
    loadData(svgEl);
};

function loadData(svgEl) {
    // data source: https://www.kaggle.com/datasets/garrickhague/temp-data-of-prominent-us-CITY_NAMES-from-1948-to-2022
    d3.csv("data/US_City_Temp_Data.csv").then(function (data) {
        createStrips(transformData(data), svgEl);
    }).catch(function (error) { console.log(error) });
};

/* ---- utilities ---- */

function formatCity(cityName) {
    let tokens = cityName.split("_");
    for (let i = 0; i < tokens.length; i++) {
        tokens[i] = tokens[i].charAt(0).toUpperCase() + tokens[i].slice(1);
    }
    return tokens.join(" ");
}

function getMonth(time) {
    return parseInt(time.substring(5, 7));
};

function getReferenceTemp(city, month) {
    return ctx.cityRefTemps[city][month - 1];
};
