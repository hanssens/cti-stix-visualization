import * as d3 from 'd3';
import { SimulationNodeDatum } from 'd3';
// define(["nbextensions/stix2viz/d3"], function(d3) {


export class StixCore {

  // Init some stuff
  // MATT: For optimization purposes, look into moving these to local variables
  public d3Config;
  public legendCallback;
  public selectedCallback;
  public refRegex = /_refs*$/;
  public relationshipsKeyRegex = /(r|R)elationships?/; // Added by Matt
  public force: d3.Simulation<SimulationNodeDatum, undefined>; // Determines the "float and repel" behavior of the nodes
  public labelForce: d3.Simulation<SimulationNodeDatum, undefined>; // Determines the "float and repel" behavior of the text labels
  public svgTop;
  public svg;
  public typeGroups = {};
  public typeIndex = 0;

  public currentGraph = {
    nodes: [],
    edges: []
  };

  public labelGraph = {
    nodes: [],
    edges: []
  };

  public idCache = {};

  constructor() {

  }

  /* ******************************************************
   * Set up variables to be used by the visualizer.
   *
   * Parameters:
   *     - canvas: <svg> element which will contain the graph
   *     - config: object containing options for the graph:
   *         - color: a d3 color scale
   *         - nodeSize: size of graph nodes, in pixels
   *         - iconSize: size of icon, in pixels
   *         - linkMultiplier: multiplier that affects the length of links between nodes
   *         - width: width of the svg containing the graph
   *         - height: height of the svg containing the graph
   *         - iconDir: directory in which the STIX 2 icons are located
   *     - legendCallback: function that takes an array of type names and create a legend for the graph
   *     - selectedCallback: function that acts on the data of a node when it is selected
   * ******************************************************/
  public vizInit(canvas, config, legendCb, selectedCb) {
    console.log('stix-core.vizInit()');

    // Set defaults for config if needed
    this.d3Config = {};
    if (typeof config === 'undefined') config = {};
    if ('color' in config) { this.d3Config.color = config.color; }
    // else { this.d3Config.color = d3.scale.category20(); } // BOOH, see https://stackoverflow.com/questions/38391411/what-is-the-d3-js-v4-0-equivalent-for-d3-scale-category10
    else { this.d3Config.color = d3.scaleOrdinal(d3.schemeCategory10); }
    if ('nodeSize' in config) { this.d3Config.nodeSize = config.nodeSize; }
    else { this.d3Config.nodeSize = 17.5; }
    if ('iconSize' in config) { this.d3Config.iconSize = config.iconSize; }
    else { this.d3Config.iconSize = 37; }
    if ('linkMultiplier' in config) { this.d3Config.linkMultiplier = config.linkMultiplier; }
    else { this.d3Config.linkMultiplier = 20; }
    if ('width' in config) { this.d3Config.width = config.width; }
    else { this.d3Config.width = 900; }
    if ('height' in config) { this.d3Config.height = config.height; }
    else { this.d3Config.height = 450; }
    if ('iconDir' in config) { this.d3Config.iconDir = config.iconDir; }
    else { this.d3Config.iconDir = "icons"; }

    if (typeof legendCb === 'undefined') { this.legendCallback = function () { }; }
    else { this.legendCallback = legendCb; }
    if (typeof selectedCb === 'undefined') { this.selectedCallback = function () { }; }
    else { this.selectedCallback = selectedCb; }

    canvas.style.width = this.d3Config.width;
    canvas.style.height = this.d3Config.height;
    // TODO: d3.force ?? this.force = d3.layout.force().charge(-400).linkDistance(this.d3Config.linkMultiplier * this.d3Config.nodeSize).size([this.d3Config.width, this.d3Config.height]);
    // TODO: d3.force ?? this.labelForce = d3.layout.force().gravity(0).linkDistance(25).linkStrength(8).charge(-120).size([this.d3Config.width, this.d3Config.height]);
    this.force = d3.forceSimulation()
      .force('charge', d3.forceManyBody()
        .strength(-400)
        .distanceMin(this.d3Config.linkMultiplier * this.d3Config.nodeSize)
        // .distanceMax(1000)

      )
      .force("y", d3.forceY(0.001))
      .force("x", d3.forceX(0.001))
      ;

    // See the migration guide:
    // https://github.com/d3/d3/blob/master/CHANGES.md#forces-d3-force

    /*
    this.force = d3.forceSimulation()
      .force("link", d3.forceLink()
        .distance(10)
        .strength(0.5))
      .force("charge", d3.forceManyBody())
      //.force("center", d3.forceCenter(width / 2, height / 2))
      ;
*/

    // this.labelForce = d3.forceSimulation()
    //   .force('x', d3.forceX(0.001))
    //   .force('y', d3.forceX(0.001))

    // this.force = d3.layout.force()
    //    .charge(-400)
    //    .linkDistance(this.d3Config.linkMultiplier * this.d3Config.nodeSize)
    //    .size([this.d3Config.width, this.d3Config.height]);


    // this.labelForce = d3.forceSimulation()

    // this.labelForce = d3.layout.force().gravity(0).linkDistance(25).linkStrength(8).charge(-120).size([this.d3Config.width, this.d3Config.height]);

    this.svgTop = d3.select('#' + canvas.id);
    this.svg = this.svgTop.append("g");
  }

  /* ******************************************************
   * Attempts to build and display the graph from an
   * arbitrary input string. If parsing the string does not
   * produce valid JSON, fails gracefully and alerts the user.
   *
   * Parameters:
   *     - content: string of valid STIX 2 content
   *     - callback: optional function to call after building the graph
   * ******************************************************/
  public vizStix(content: any, callback) {
    console.log('stix-core.vizStix()');

    let parsed;

    if (typeof content === 'string' || content instanceof String) {
      try {
        const j = JSON.stringify(content);
        parsed = JSON.parse(j); // Saving this to a variable stops the rest of the function from executing on parse failure
      } catch (err) {
        alert("Something went wrong!\n\nError:\n" + err);
        return;
      }
    }
    else if (this.isStixObj(content)) {
      parsed = content;
    }
    else {
      alert("Something went wrong!\n\nError:\n Input is neither parseable JSON nor a STIX object");
      return;
    }
    this.buildNodes(parsed);
    this.initGraph();
    if (typeof callback !== 'undefined') callback();
  }

  /* ******************************************************
   * Returns true if the JavaScript object passed in has
   * properties required by all STIX objects.
   * ******************************************************/
  public isStixObj(obj) {
    if ('type' in obj && 'id' in obj && (('created' in obj &&
      'modified' in obj) || (obj.type === 'bundle'))) {
      return true;
    } else {
      return false;
    }
  }

  /* ******************************************************
   * Generates the components on the chart from the JSON data
   * ******************************************************/
  public initGraph() {
    console.log('stix-core.initGraph()');

    console.log('this.currentgraph: ', this.currentGraph);
    // this.force.nodes(this.currentGraph.nodes).links(this.currentGraph.edges).start();
    // this.labelForce.nodes(this.labelGraph.nodes).links(this.labelGraph.edges).start();

    // create filter with id #drop-shadow
    // height=130% so that the shadow is not clipped
    var filter = this.svg.append("svg:defs").append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "200%")
      .attr("width", "200%")
      .attr("x", "-50%") // x and y have to have negative offsets to
      .attr("y", "-50%"); // stop the edges from getting cut off
    // translate output of Gaussian blur to the right and downwards with 2px
    // store result in offsetBlur
    filter.append("feOffset")
      .attr("in", "SourceAlpha")
      .attr("dx", 0)
      .attr("dy", 0)
      .attr("result", "offOut");
    // SourceAlpha refers to opacity of graphic that this filter will be applied to
    // convolve that with a Gaussian with standard deviation 3 and store result
    // in blur
    filter.append("feGaussianBlur")
      .attr("in", "offOut")
      .attr("stdDeviation", 7)
      .attr("result", "blurOut");
    filter.append("feBlend")
      .attr("in", "SourceGraphic")
      .attr("in2", "blurOut")
      .attr("mode", "normal");

    // Adds style directly because it wasn't getting picked up by the style sheet
    var link = this.svg.selectAll('path.link').data(this.currentGraph.edges).enter().append('path')
      .attr('class', 'link')
      .style("stroke", "#aaa")
      .style('fill', "#aaa")
      .style("stroke-width", "3px")
      .attr('id', function (d, i) { return "link_" + i; })
      .on('click', function (d, i) { this.handleSelected(d, this); });

    // Create the text labels that will be attatched to the paths
    var linktext = this.svg.append("svg:g").selectAll("g.linklabelholder").data(this.currentGraph.edges);
    linktext.enter().append("g").attr("class", "linklabelholder")
      .append("text")
      .attr("class", "linklabel")
      .style("font-size", "13px")
      .attr("text-anchor", "start")
      .style("fill", "#000")
      .append("textPath")
      .attr("xlink:href", function (d, i) { return "#link_" + i; })
      .attr("startOffset", "20%")
      .text(function (d) {
        return d.label;
      });
    var linklabels = this.svg.selectAll('.linklabel');

    var node = this.svg.selectAll("g.node")
      .data(this.currentGraph.nodes)
      .enter().append("g")
      .attr("class", "node")
    // .call(this.force.drag); // <-- What does the "call()" function do?
    node.append("circle")
      .attr("r", this.d3Config.nodeSize)
      .style("fill", function (d) { return this.d3Config.color(d.typeGroup); });
    node.append("image")
      .attr("xlink:href", function (d) { return this.d3Config.iconDir + "/stix2_" + d.type.replace(/\-/g, '_') + "_icon_tiny_round_v1.png"; })
      .attr("x", "-" + (this.d3Config.nodeSize + 0.5) + "px")
      .attr("y", "-" + (this.d3Config.nodeSize + 1.5) + "px")
      .attr("width", this.d3Config.iconSize + "px")
      .attr("height", this.d3Config.iconSize + "px");
    node.on('click', function (d, i) { this.handleSelected(d, this); }); // If they're holding shift, release

    // Fix on click/drag, unfix on double click
    /*
    this.force.drag().on('dragstart', function(d, i) {
        d3.event.sourceEvent.stopPropagation(); // silence other listeners
        this.handlePin(d, this, true);
    });//d.fixed = true });
    node.on('dblclick', function(d, i) { this.handlePin(d, this, false); });//d.fixed = false });
*/
    /*
            // Right click will greatly dim the node and associated edges
            // >>>>>>> Does not currently work <<<<<<<
            node.on('contextmenu', function(d) {
                if (d.dimmed) {
                    d.dimmed = false; // <-- What is this? Where is this set? How does this work?
                    d.attr("class", "node");
                } else {
                    d.dimmed = true;
                    d.attr("class", "node dimmed");
                }
            });
    */
    var anchorNode = this.svg.selectAll("g.anchorNode").data(this.labelForce.nodes()).enter().append("svg:g").attr("class", "anchorNode");
    anchorNode.append("svg:circle").attr("r", 0).style("fill", "#FFF");
    anchorNode.append("svg:text").text(function (d, i) {
      return i % 2 === 0 ? "" : this.nameFor(d.node);
    }).style("fill", "#555").style("font-family", "Arial").style("font-size", 12);

    // Code in the "tick" function determines where the elements
    // should be redrawn every cycle (essentially, it allows the
    // elements to be animated)
    this.force.on("tick", function () {

      link.attr("d", function (d) { return this.drawArrow(d); });

      node.call(function () {
        this.attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
      });

      anchorNode.each(function (d, i) {
        this.labelForce.start();
        if (i % 2 === 0) {
          d.x = d.node.x;
          d.y = d.node.y;
        } else {
          var b = this.childNodes[1].getBBox();

          var diffX = d.x - d.node.x;
          var diffY = d.y - d.node.y;

          var dist = Math.sqrt(diffX * diffX + diffY * diffY);

          var shiftX = b.width * (diffX - dist) / (dist * 2);
          shiftX = Math.max(-b.width, Math.min(0, shiftX));
          var shiftY = 5;
          this.childNodes[1].setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
        }
      });

      anchorNode.call(function () {
        this.attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
      });

      linklabels.attr('transform', function (d, i) {
        if (d.target.x < d.source.x) {
          this.bbox = this.getBBox();
          this.rx = this.bbox.x + this.bbox.width / 2;
          this.ry = this.bbox.y + this.bbox.height / 2;
          return 'rotate(180 ' + this.rx + ' ' + this.ry + ')';
        }
        else {
          return 'rotate(0)';
        }
      });
    });

    // Code to handle zooming and dragging the viewing area
    // this.svgTop.call(d3.behavior.zoom()
    this.svgTop.call(d3.zoom()
      .scaleExtent([0.25, 5])
      .on("zoom", () => {
        this.svg.attr("transform",
          "translate(" + d3.event.translate + ") " +
          "scale(" + d3.event.scale + ")"
        );
      })
    )
      .on("dblclick.zoom", null);
  }

  /* ******************************************************
   * Draws an arrow between two points.
   * ******************************************************/
  public drawArrow(d) {
    return this.drawLine(d) + this.drawArrowHead(d);
  }

  /* ******************************************************
   * Draws a line between two points
   * ******************************************************/
  public drawLine(d) {
    return this.startAt(d.source) + this.lineTo(d.target);
  }

  /* ******************************************************
   * Draws an arrow head.
   * ******************************************************/
  public drawArrowHead(d) {
    var arrowTipPoint = this.calculateArrowTipPoint(d);
    return this.startAt(arrowTipPoint)
      + this.lineTo(this.calculateArrowBaseRightCornerPoint(d, arrowTipPoint))
      + this.lineTo(this.calculateArrowBaseLeftCornerPoint(d, arrowTipPoint))
      + this.lineTo(arrowTipPoint)
      + this.closePath();
  }

  /* ******************************************************
   * Creates the SVG for a starting point.
   * ******************************************************/
  public startAt(startPoint) {
    return 'M' + startPoint.x + ',' + startPoint.y;
  }

  /* ******************************************************
   * Creates the SVG for line to a point.
   * ******************************************************/
  public lineTo(endPoint) {
    return 'L' + endPoint.x + ',' + endPoint.y;
  }

  /* ******************************************************
   * Calculates the point at which the arrow tip should be.
   * ******************************************************/
  public calculateArrowTipPoint(d) {
    var nodeRadius = Math.max(this.d3Config.iconSize, this.d3Config.nodeSize) / 2;
    return this.translatePoint(d.target, this.calculateUnitVectorAlongLine(d), -(this.d3Config.nodeSize + 3));
  }

  /* ******************************************************
   * Calculates the point at which the right corner of the
   * base of the arrow head should be.
   * ******************************************************/
  public calculateArrowBaseRightCornerPoint(d, arrowTipPoint) {
    var arrowBaseWidth = 13;
    var unitVector = this.calculateUnitVectorAlongLine(d);
    var arrowBasePoint = this.calculateArrowBaseCentrePoint(d, arrowTipPoint);
    return this.translatePoint(arrowBasePoint, this.calculateNormal(unitVector), -arrowBaseWidth / 2);
  }

  /* ******************************************************
   * Calculates the point at which the left corner of the
   * base of the arrow head should be.
   * ******************************************************/
  public calculateArrowBaseLeftCornerPoint(d, arrowTipPoint) {
    var arrowBaseWidth = 13;
    var unitVector = this.calculateUnitVectorAlongLine(d);
    var arrowBasePoint = this.calculateArrowBaseCentrePoint(d, arrowTipPoint);
    return this.translatePoint(arrowBasePoint, this.calculateNormal(unitVector), arrowBaseWidth / 2);
  }

  /* ******************************************************
   * Calculates the point at the centre of the base of the
   * arrow head.
   * ******************************************************/
  public calculateArrowBaseCentrePoint(d, arrowTipPoint) {
    var arrowHeadLength = 13;
    return this.translatePoint(arrowTipPoint, this.calculateUnitVectorAlongLine(d), -arrowHeadLength);
  }

  /* ******************************************************
   * Translates a point.
   * ******************************************************/
  public translatePoint(startPoint, directionUnitVector, distance) {
    return { x: startPoint.x + distance * directionUnitVector.x, y: startPoint.y + distance * directionUnitVector.y };
  }

  /* ******************************************************
   * Calculates a unit vector along a particular line.
   * ******************************************************/
  public calculateUnitVectorAlongLine(d) {
    var dx = d.target.x - d.source.x;
    var dy = d.target.y - d.source.y;
    var dr = Math.sqrt(dx * dx + dy * dy);
    return { x: dx / dr, y: dy / dr };
  }

  /* ******************************************************
   * Calculates a normal to a unit vector.
   * ******************************************************/
  public calculateNormal(unitVector) {
    return { x: -unitVector.y, y: unitVector.x };
  }

  /* ******************************************************
   * Closes an SVG path.
   * ******************************************************/
  public closePath() {
    return 'Z';
  }

  /* ******************************************************
   * Screens out D3 chart data from the presentation.
   * Also makes values more readable.
   * Called as the 2nd parameter to JSON.stringify().
   * ******************************************************/
  public replacer(key, value) {
    var blacklist = ["typeGroup", "index", "weight", "x", "y", "px", "py", "fixed", "dimmed"];
    if (blacklist.indexOf(key) >= 0) {
      return undefined;
    }
    // Some of the potential values are not very readable (IDs
    // and object references). Let's see if we can fix that.
    // Lots of assumptions being made about the structure of the JSON here...
    var dictlist = ['definition', 'objects'];
    if (Array.isArray(value)) {
      if (key === 'kill_chain_phases') {
        var newValue = [];
        value.forEach(function (item) {
          newValue.push(item.phase_name)
        });
        return newValue;
      } else if (key === 'granular_markings' || key === 'external_references') {
        var newValue = [];
        value.forEach(function (item) {
          newValue.push(JSON.stringify(item));
        });
        return newValue.join(", ");
      } else {
        return value.join(", ");
      }
    } else if (/--/.exec(value) && !(key === "id")) {
      if (!(this.idCache[value] === null || this.idCache[value] === undefined)) {
        // IDs are gross, so let's display something more readable if we can
        // (unless it's actually the node id)
        return this.currentGraph.nodes[this.idCache[value]].name;
      }
    } else if (dictlist.indexOf(key) >= 0) {
      return JSON.stringify(value);
    }
    return value;
  }

  /* ******************************************************
   * Adds class "selected" to last graph element clicked
   * and removes it from all other elements.
   *
   * Takes datum and element as input.
   * ******************************************************/
  public handleSelected(d, el) {
    const jsonString = JSON.stringify(d, this.replacer, 2); // get only the STIX values
    let purified = JSON.parse(jsonString); // make a new JSON object from the STIX values

    // Pretty up the keys
    for (var key in purified) {
      if (d.hasOwnProperty(key)) {
        var keyString = key;
        if (this.refRegex.exec(key)) { // key is "created_by_ref"... let's pretty that up
          keyString = key.replace(/_(refs*)?/g, " ").trim();
        } else {
          keyString = keyString.replace(/_/g, ' ');
        }
        keyString = keyString.charAt(0).toUpperCase() + keyString.substr(1).toLowerCase() // Capitalize it
        keyString += ":";

        purified[keyString] = purified[key];
        delete purified[key];
      }
    }

    this.selectedCallback(purified);
    d3.select('.selected').classed('selected', false);
    d3.select(el).classed('selected', true);
  }

  /* ******************************************************
   * Handles pinning and unpinning of nodes.
   *
   * Takes datum, element, and boolean as input.
   * ******************************************************/
  public handlePin(d, el, pinBool) {
    d.fixed = pinBool;
    d3.select(el).classed("pinned", pinBool);
  }

  /* ******************************************************
   * Parses the JSON input and builds the arrays used by
   * initGraph().
   *
   * Takes a JSON object as input.
   * ******************************************************/
  public buildNodes(thePackage) {
    console.log('stix-core.buildNodes()');

    let relationships = [];
    if (thePackage.hasOwnProperty('objects')) {
      this.parseSDOs(thePackage['objects']);

      // Get embedded relationships
      thePackage['objects'].forEach(function (item) {
        if (item['type'] === 'relationship') {
          relationships.push(item);
          return;
        }
        if ('created_by_ref' in item) {
          relationships.push({
            'source_ref': item['id'],
            'target_ref': item['created_by_ref'],
            'relationship_type': 'created-by'
          });
        }
        if ('object_marking_refs' in item) {
          item['object_marking_refs'].forEach(function (markingID) {
            relationships.push({
              'source_ref': markingID,
              'target_ref': item['id'],
              'relationship_type': 'applies-to'
            });
          });
        }
        if ('object_refs' in item) {
          item['object_refs'].forEach(function (objID) {
            relationships.push({
              'source_ref': item['id'],
              'target_ref': objID,
              'relationship_type': 'refers-to'
            });
          });
        }
        if ('sighting_of_ref' in item) {
          relationships.push({
            'source_ref': item['id'],
            'target_ref': item['sighting_of_ref'],
            'relationship_type': 'sighting-of'
          });
        }
        if ('observed_data_refs' in item) {
          item['observed_data_refs'].forEach(function (objID) {
            relationships.push({
              'source_ref': item['id'],
              'target_ref': objID,
              'relationship_type': 'observed'
            });
          });
        }
        if ('where_sighted_refs' in item) {
          item['where_sighted_refs'].forEach(function (objID) {
            relationships.push({
              'source_ref': objID,
              'target_ref': item['id'],
              'relationship_type': 'saw'
            });
          });
        }
      });
    };

    this.addRelationships(relationships);

    // Add the legend so we know what's what
    this.legendCallback(Object.keys(this.typeGroups));
  }

  /* ******************************************************
   * Adds a name to an SDO Node
   * ******************************************************/
  public nameFor(sdo) {
    if (sdo.type === 'relationship') {
      return "rel: " + (sdo.value);
    } else if (sdo.name !== undefined) {
      return sdo.name;
    } else {
      return sdo.type;
    }
  }

  /* ******************************************************
   * Parses valid SDOs from an array of potential SDO
   * objects (ideally from the data object)
   *
   * Takes an array of objects as input.
   * ******************************************************/
  public parseSDOs(container) {
    var cap = container.length;
    for (var i = 0; i < cap; i++) {
      // So, in theory, each of these should be an SDO. To be sure, we'll check to make sure it has an `id` and `type`. If not, raise an error and ignore it.
      var maybeSdo = container[i];
      if (maybeSdo.id === undefined || maybeSdo.type === undefined) {
        console.error("Should this be an SDO???", maybeSdo);
      } else {
        this.addSdo(maybeSdo);
      }
    }
  }

  /* ******************************************************
   * Adds an SDO node to the graph
   *
   * Takes a valid SDO object as input.
   * ******************************************************/
  public addSdo(sdo) {
    if (this.idCache[sdo.id]) {
      console.log("Skipping already added object!", sdo);
    } else if (sdo.type === 'relationship') {
      console.log("Skipping relationship object!", sdo);
    } else {
      if (this.typeGroups[sdo.type] === undefined) {
        this.typeGroups[sdo.type] = this.typeIndex++;
      }
      sdo.typeGroup = this.typeGroups[sdo.type];

      this.idCache[sdo.id] = this.currentGraph.nodes.length; // Edges reference nodes by their array index, so cache the current length. When we add, it will be correct
      this.currentGraph.nodes.push(sdo);

      this.labelGraph.nodes.push({ node: sdo }); // Two labels will orbit the node, we display the less crowded one and hide the more crowded one.
      this.labelGraph.nodes.push({ node: sdo });

      this.labelGraph.edges.push({
        source: (this.labelGraph.nodes.length - 2),
        target: (this.labelGraph.nodes.length - 1),
        weight: 1
      });
    }
  }

  /* ******************************************************
   * Adds relationships to the graph based on the array of
   * relationships contained in the data.
   *
   * Takes an array as input.
   * ******************************************************/
  public addRelationships(relationships) {
    for (var i = 0; i < relationships.length; i++) {
      var rel = relationships[i];
      if (this.idCache[rel.source_ref] === null || this.idCache[rel.source_ref] === undefined) {
        console.error("Couldn't find source!", rel);
      } else if (this.idCache[rel.target_ref] === null || this.idCache[rel.target_ref] === undefined) {
        console.error("Couldn't find target!", rel);
      } else {
        this.currentGraph.edges.push({ source: this.idCache[rel.source_ref], target: this.idCache[rel.target_ref], label: rel.relationship_type });
      }
    }
  }

  /* ******************************************************
   * Resets the graph so it can be rebuilt
   * *****************************************************/
  public vizReset() {
    this.typeGroups = {};
    this.typeIndex = 0;

    this.currentGraph = {
      nodes: [],
      edges: []
    };
    this.labelGraph = {
      nodes: [],
      edges: []
    };

    this.idCache = {};

    this.force.stop();
    this.labelForce.stop();
    this.svg.remove();
  }

  /*
   * TODO: fix modules
  module = {
      "vizInit": vizInit,
      "vizReset": vizReset,
      "vizStix": vizStix
  };

  return module;
  */
}
//  });
