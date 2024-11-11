const ctx = {
    MAP_W: 1024,
    MAP_H: 1024,
    YEAR: "2020",
};

function createViz() {
    console.log("Using D3 v" + d3.version);

    d3.select("#mapContainer").append("svg")
                              .attr("width", ctx.MAP_W)
                              .attr("height", ctx.MAP_H);

    Promise.all(loadData()).then(data => {

        const [cntbn, cntrg, gra, nutsbn, nutsrg, popDensity] = data;

        ctx.proj = d3.geoIdentity() .reflectY(true) .fitSize([ctx.MAP_W, ctx.MAP_H], gra); // graticule is the data structure parsed from gra.geojson

        ctx.path = d3.geoPath().projection(ctx.proj);

        d3.select("svg")
        .append("g")
        .selectAll("path")
        .data(nutsrg.features)
        .enter()
        .append("path")
        .attr("d", ctx.path)
        .attr("class", "nutsArea")
        .style("fill", "black");

        d3.select("svg")
        .append("g")
        .selectAll("path")
        .data(nutsbn.features)
        .enter()
        .append("path")
        .attr("d", ctx.path)
        .attr("class", "nutsBorder")
        .style("stroke", "grey")
        .style("stroke-width", 0.5);

        const minDensity = d3.min(popDensity, d => d.OBS_VALUE);
        const maxDensity = d3.max(popDensity, d => d.OBS_VALUE);

        const logDensityScale = d3.scaleLog().domain([minDensity, maxDensity]);

        const colorScale = d3.scaleSequential(d => d3.interpolateViridis(logDensityScale(d)));

        d3.selectAll(".nutsArea")
        .style("fill", d => {
            const density = d.properties.density; 
            return density ? colorScale(density) : "#ccc";
            // console.log(density);
        });

        console.log("Desity drawn");

        d3.select("svg")
        .append("g")
        .selectAll("path")
        .data(cntrg.features)
        .enter()
        .append("path")
        .attr("d", ctx.path)
        .attr("class", "countryArea");

        d3.select("svg")
        .append("g")
        .selectAll("path")
        .data(cntbn.features)
        .enter()
        .append("path")
        .attr("d", ctx.path)
        .attr("class", "countryBorder");

    });

};

function loadData() {

    const promises = [
        d3.json("data/0601/cntbn.geojson"),
        d3.json("data/0601/cntrg.geojson"),
        d3.json("data/0601/gra.geojson"),
        d3.json("data/0601/nutsbn.geojson"),
        d3.json("data/0601/nutsrg.geojson"),
        d3.csv("data/0601/pop_density_nuts3.csv"),
      ];

      Promise.all(promises).then(data => {

        const [cntbn, cntrg, gra, nutsbn, nutsrg, popDensity] = data;

        nutsrg.features.forEach(feature => {
            const geoId = feature.properties.id;

            const densityRow = popDensity.find(row => row.geo === geoId && row.TIME_PERIOD === ctx.YEAR);

            if (densityRow) {
                feature.properties.density = densityRow.OBS_VALUE;
                // console.log("density", densityRow.OBS_VALUE);
            } else {
                feature.properties.density = null;
            }
        });

        console.log("Data loaded");
    });

    return promises;
}



// NUTS data as JSON from https://github.com/eurostat/Nuts2json (translated from topojson to geojson)
// density data from https://data.europa.eu/data/datasets/gngfvpqmfu5n6akvxqkpw?locale=en
