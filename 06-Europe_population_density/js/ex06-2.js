var createPlot = function(){
    vlSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "background": "rgb(250, 250, 250)"
    };
    vlOpts = {width:1000, height:600, actions:false};
    vegaEmbed("#map", vlSpec, vlOpts);
};
