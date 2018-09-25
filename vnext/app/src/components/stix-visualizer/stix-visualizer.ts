// import * as stix2viz from './../../lib/stix2viz/stix2viz/stix2viz';
// var stix2viz = require('cti-stix-visualization/stix2viz/stix2viz/stix2viz');

// var d3 = require('./../../lib/stix2viz/d3/d3');
// var stix2viz = require('./../../lib/stix2viz/stix2viz/stix2viz');
import { StixCore } from './stix-core';

export class StixVisualizer {

  public canvas: any;
  public stix: StixCore = new StixCore();

  public cfg = {
    iconDir: "stix2viz/stix2viz/icons"
  }

  attached() {

    // If you wish to integrate the visualizer into your own web application, just include stix2viz.js on your page.
    // Then use vizInit(mySvgElement) followed by vizStix(content) to visualize your STIX content.
    // Finally, use vizReset() if you need to clear the graph.

    // console.log('stix2viz: ', stix2viz);
    // stix2viz.vizInit(this.canvas);
    // let content = ''; // raw peace of json...


    this.stix.vizInit(this.canvas, this.cfg, this.populateLegend, this.populateSelected);
    this.stix.vizStix(this.content, this.vizCallback);
  }

  // Init some stuff
  // MATT: For optimization purposes, look into moving these to local variables
  selectedContainer = document.getElementById('selection');
  // uploader = document.getElementById('uploader');
  canvasContainer = document.getElementById('canvas-container');
  //canvas = document.getElementById('canvas');
  // styles = window.getComputedStyle(uploader);

  /* ******************************************************
   * Resizes the canvas based on the size of the window
   * ******************************************************/
  resizeCanvas() {
    var cWidth = document.getElementById('legend').offsetLeft - 52;
    var cHeight = window.innerHeight - document.getElementsByTagName('h1')[0].offsetHeight - 27;
    document.getElementById('canvas-wrapper').style.width = cWidth.toString();
    this.canvas.style.width = cWidth.toString();
    this.canvas.style.height = cHeight.toString();
  }

  /* ******************************************************
   * Will be called right before the graph is built.
   * ******************************************************/
  vizCallback() {
    this.hideMessages();
    this.resizeCanvas();
  }

  /* ******************************************************
   * Initializes the graph, then renders it.
   * ******************************************************/
  vizStixWrapper(content) {
    this.cfg = {
      iconDir: "stix2viz/stix2viz/icons"
    }
    this.stix.vizInit(this.canvas, this.cfg, this.populateLegend, this.populateSelected);
    this.stix.vizStix(content, this.vizCallback);
  }

  /* ----------------------------------------------------- *
   * ******************************************************
   * This group of functions is for handling file "upload."
   * They take an event as input and parse the file on the
   * front end.
   * ******************************************************/
  /*
  handleFileSelect(evt) {
    handleFiles(evt.target.files);
  }
  
  handleFileDrop(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    handleFiles(evt.dataTransfer.files);
  }
  
  handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }
  
  handleFiles(files) {
    // files is a FileList of File objects (in our case, just one)
    for (var i = 0, f; f = files[i]; i++) {
      document.getElementById('chosen-files').innerText += f.name + " ";

      var r = new FileReader();
      r.onload = function(e) {vizStixWrapper(e.target.result)};
      r.readAsText(f);
    }
    linkifyHeader();
  }
  */

  /* ---------------------------------------------------- */

  /* ******************************************************
   * Handles content pasted to the text area.
   * ******************************************************/
  /*
  function handleTextarea() {
    content = document.getElementById('paste-area').value;
    vizStixWrapper(content)
    linkifyHeader();
  }
  */

  /* ******************************************************
   * Fetches STIX 2.0 data from an external URL (supplied
   * user) via AJAX. Server-side Access-Control-Allow-Origin
   * must allow cross-domain requests for this to work.
   * ******************************************************/
  /*
  function handleFetchJson() {
    var url = document.getElementById("url").value;
    fetchJsonAjax(url, function(content) {
      vizStixWrapper(content)
    });
    linkifyHeader();
  }
  */

  /* ******************************************************
   * Adds icons and information to the legend.
   *
   * Takes an array of type names as input
   * ******************************************************/
  populateLegend(typeGroups) {
    var ul = document.getElementById('legend-content');
    typeGroups.forEach(function (typeName) {
      var li = document.createElement('li');
      var val = document.createElement('p');
      var key = document.createElement('div');
      key.style.backgroundImage = "url('stix2viz/stix2viz/icons/stix2_" + typeName.replace(/\-/g, '_') + "_icon_tiny_round_v1.png')";
      val.innerText = typeName.charAt(0).toUpperCase() + typeName.substr(1).toLowerCase(); // Capitalize it
      li.appendChild(key);
      li.appendChild(val);
      ul.appendChild(li);
    });
  }

  /* ******************************************************
   * Adds information to the selected node table.
   *
   * Takes datum as input
   * ******************************************************/
  populateSelected(d) {
    // Remove old values from HTML
    this.selectedContainer.innerHTML = "";

    var counter = 0;

    Object.keys(d).forEach(function (key) { // Make new HTML elements and display them
      // Create new, empty HTML elements to be filled and injected
      var div = document.createElement('div');
      var type = document.createElement('div');
      var val = document.createElement('div');

      // Assign classes for proper styling
      if ((counter % 2) != 0) {
        div.classList.add("odd"); // every other row will have a grey background
      }
      type.classList.add("type");
      val.classList.add("value");

      // Add the text to the new inner html elements
      var value = d[key];
      type.innerText = key;
      val.innerText = value;

      // Add new divs to "Selected Node"
      div.appendChild(type);
      div.appendChild(val);
      this.selectedContainer.appendChild(div);

      // increment the class counter
      counter += 1;
    });
  }

  /* ******************************************************
   * Hides the data entry container and displays the graph
   * container
   * ******************************************************/
  hideMessages() {
    // uploader.classList.toggle("hidden");
    this.canvasContainer.classList.toggle("hidden");
  }

  /* ******************************************************
   * Turns header into a "home" "link"
   * ******************************************************/
  linkifyHeader() {
    var header = document.getElementById('header');
    header.classList.add('linkish');
  }

  /* *****************************************************
   * Returns the page to its original load state
   * *****************************************************/
  resetPage() {
    var header = document.getElementById('header');
    if (header.classList.contains('linkish')) {
      this.hideMessages();
      this.stix.vizReset();
      // document.getElementById('files').value = ""; // reset the files input
      document.getElementById('chosen-files').innerHTML = ""; // reset the subheader text
      document.getElementById('legend-content').innerHTML = ""; // reset the legend in the sidebar

      header.classList.remove('linkish');
    }
  }

  /* ******************************************************
   * Generic AJAX 'GET' request.
   *
   * Takes a URL and a callback function as input.
   * ******************************************************/
  fetchJsonAjax(url, cfunc) {
    var regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i;
    if (!regex.test(url)) {
      alert("ERROR: Double check url provided");
    }

    // var xhttp;
    // if (window.XMLHttpRequest) {
    //   xhttp = new XMLHttpRequest();
    // } else {
    //   xhttp = new ActiveXObject("Microsoft.XMLHTTP"); // For IE5 and IE6 luddites
    // }

    let xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function () {
      if (xhttp.readyState == 4 && xhttp.status == 200) {
        cfunc(xhttp.responseText);
      } else if (xhttp.status != 200 && xhttp.status != 0) {
        alert("ERROR: " + xhttp.status + ": " + xhttp.statusText + " - Double check url provided");
        return;
      }

      xhttp.onerror = function () {
        alert("ERROR: Unable to fetch JSON. The domain entered has either rejected the request, \
is not serving JSON, or is not running a webserver.\n\nA GitHub Gist can be created to host RAW JSON data to prevent this.");
      };
    }
    xhttp.open("GET", url, true);
    xhttp.send();
  }

  /* ******************************************************
   * AJAX 'GET' request from `?url=` parameter
   *
   * Will check the URL during `window.onload` to determine
   * if `?url=` parameter is provided
   * ******************************************************/
  fetchJsonFromUrl() {
    var url = window.location.href;

    // If `?` is not provided, load page normally
    if (/\?/.test(url)) {
      // Regex to see if `url` parameter has a valid url value
      var regex = /\?url=https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i;
      var res = regex.exec(url);
      if (res != null) {
        // Get the value from the `url` parameter
        let req_url = res[0].substring(5);

        // Fetch JSON from the url
        this.fetchJsonAjax(req_url, function (content) {
          this.vizStixWrapper(content)
        });
        this.linkifyHeader();

      } else {
        alert("ERROR: Invalid url - Request must start with '?url=http[s]://' and be a valid domain");
      }
    }
  }

  selectedNodeClick() {
    let selected = document.getElementById('selected');
    if (selected.className.indexOf('clicked') === -1) {
      selected.className += " clicked";
      selected.style.position = 'absolute';
      selected.style.left = '25px';
      selected.style.width = (window.innerWidth - 110).toString();
      selected.style.top = (document.getElementById('legend').offsetHeight + 25).toString();
      selected.scrollIntoView(true);
    } else {
      selected.className = "sidebar"
      selected.removeAttribute("style")
    }
  }


  /* ******************************************************
   * When the page is ready, setup the visualization and bind events
   * ******************************************************/
  /*
  document.getElementById('files').addEventListener('change', handleFileSelect, false);
  document.getElementById('paste-parser').addEventListener('click', handleTextarea, false);
  document.getElementById('fetch-url').addEventListener('click', handleFetchJson, false);
  document.getElementById('header').addEventListener('click', resetPage, false);
  // uploader.addEventListener('dragover', handleDragOver, false);
  // uploader.addEventListener('drop', handleFileDrop, false);
  window.onresize = this.resizeCanvas;
  document.getElementById('selected').addEventListener('click', selectedNodeClick, false);
  fetchJsonFromUrl();

  */
  private content = `{
  "type": "bundle",
  "spec_version": "2.0",
  "id": "bundle--999aff42-349e-4d29-a8a0-8b00618fcfb3",
  "objects": [
    {
      "sighting_of_ref": "indicator--f1d67a0c-f2a8-4f3e-8bc6-92565458d08a",
      "created": "2018-09-17T05:38:15.747Z",
      "where_sighted_refs": [
        "identity--60694bc9-4ace-479d-ae3a-59fcf636ddb9"
      ],
      "first_seen": "2018-09-17T05:38:15.7478Z",
      "observed_data_refs": [
        "observed-data--476f03c6-d1e6-3650-8e1e-42894cae1189"
      ],
      "type": "sighting",
      "modified": "2018-09-17T05:38:15.747Z",
      "last_seen": "2018-09-17T05:38:15.7478Z",
      "count": 1,
      "created_by_ref": "identity--235a171b-e23a-4e6e-904e-5c45a948814c",
      "id": "sighting--cd07cfba-9a09-4e5a-8384-063f1568a533"
    },
    {
      "created": "2018-09-17T05:38:14.149Z",
      "id": "observed-data--476f03c6-d1e6-3650-8e1e-42894cae1189",
      "x_sic_entity_by_ref": "identity--60694bc9-4ace-479d-ae3a-59fcf636ddb9",
      "number_observed": 1,
      "first_observed": "2018-09-17T05:37:08Z",
      "created_by_ref": "identity--235a171b-e23a-4e6e-904e-5c45a948814c",
      "x_sic_custom_properties": {
        "logs_download_enabled": true,
        "zone_name": "Med-Priority Internet",
        "soc_analyst_required": false,
        "zone_type": "UNSPECIFIED_ZONE",
        "vessel_imo": "0",
        "service_subscribed": true,
        "pool_id": "9",
        "install_id": "6587",
        "zone_priority_level": "HIGH_TRAFFIC",
        "customer_id": "828",
        "zone_id": "282",
        "unkown_service_option": false,
        "site_id": "5855"
      },
      "x_sic_tags": [
        {
          "value": "cdnth.zbporn.com",
          "tag_id": "98290b772cb86eed2087e0fc0ed4fbccb91423def952392f08ca71dba1bb809d",
          "object_path": "domain-name:value"
        },
        {
          "value": "cdnth.zbporn.com",
          "tag_id": "363ed6560fce3bb03175a9c1450235693c3a41f30498440a15ff42c3393e07b5",
          "object_path": "domain-name:value"
        },
        {
          "value": "cdnth.zbporn.com",
          "tag_id": "1119a70843301816e2e296f5fd380aaa4f76933af2bf5e5a977e1dba551419fd",
          "object_path": "domain-name:value"
        },
        {
          "value": "cdnth.zbporn.com",
          "tag_id": "02a4ed3aa71ef615ee15d33f5bf039bb680112fda069ed41b0327204bcbc1c18",
          "object_path": "domain-name:value"
        },
        {
          "value": "cdnth.zbporn.com",
          "tag_id": "615d28f0ae78a612d2c7763776f21e86fad9ebc907a4b439ad21abe8ac4e9b48",
          "object_path": "domain-name:value"
        }
      ],
      "type": "observed-data",
      "x_sic_timestamps": {
        "nifi_kafka_end_timestamp": 1537162694107,
        "nifi_sicmessageprocessor_end_timestamp": 1537162694215,
        "nifi_controlrate_end_timestamp": 1537162694147
      },
      "objects": {
        "0": {
          "value": "8.8.8.8",
          "type": "ipv4-addr"
        },
        "1": {
          "value": "10.140.15.22",
          "type": "ipv4-addr"
        },
        "2": {
          "value": "cdnth.zbporn.com",
          "type": "domain-name"
        },
        "3": {
          "dst_packets": 1,
          "end": "2018-09-17T05:37:08Z",
          "src_byte_count": 0,
          "src_port": 0,
          "x_retcode": "0",
          "protocols": [
            "dns"
          ],
          "type": "x-dns-traffic",
          "src_ref": "1",
          "dst_ref": "0",
          "x_querytype": "A",
          "_valid_refs": {
            "0": "ipv4-addr",
            "1": "ipv4-addr",
            "2": "domain-name",
            "3": "x-dns-traffic"
          },
          "dst_byte_count": 62,
          "x_latency_ms": 0,
          "start": "2018-09-17T05:37:08Z",
          "dst_port": 0,
          "x_dnsquery_ref": "2",
          "src_packets": 0
        }
      },
      "modified": "2018-09-17T05:38:14.149Z",
      "last_observed": "2018-09-17T05:37:08Z"
    },
    {
      "created": "2018-09-17T05:38:15.751Z",
      "modified": "2018-09-17T05:38:15.751Z",
      "name": "Marlink 828",
      "id": "identity--235a171b-e23a-4e6e-904e-5c45a948814c",
      "identity_class": "community",
      "type": "identity",
      "description": "Marlink customer 828"
    },
    {
      "created": "2018-09-17T05:38:15.751Z",
      "type": "identity",
      "modified": "2018-09-17T05:38:15.751Z",
      "name": "Vessel 5855",
      "x_sic_site_id": "5855",
      "id": "identity--60694bc9-4ace-479d-ae3a-59fcf636ddb9",
      "identity_class": "entity",
      "created_by_ref": "identity--235a171b-e23a-4e6e-904e-5c45a948814c",
      "description": "Customer 828 - Vessel 5855",
      "x_sic_alert qualification mode": ""
    },
    {
      "labels": [
        "malicious-activity"
      ],
      "x_sic_entities_by_refs": [
        "identity--60694bc9-4ace-479d-ae3a-59fcf636ddb9"
      ],
      "pattern": "[domain-name:value MATCHES 'porn' OR domain-name:value MATCHES 'cumshot' OR domain-name:value MATCHES 'gangbang' OR domain-name:value MATCHES 'orgy' OR domain-name:value MATCHES 'swallow' OR domain-name:value MATCHES 'voyeur' OR domain-name:value MATCHES 'amateur'] ",
      "valid_from": "2018-09-17T05:38:15.7437Z",
      "type": "indicator",
      "created": "2018-09-17T05:38:15.743Z",
      "created_by_ref": "identity--235a171b-e23a-4e6e-904e-5c45a948814c",
      "modified": "2018-09-17T05:38:15.743Z",
      "name": "Abusive bandwidth usage porn",
      "id": "indicator--f1d67a0c-f2a8-4f3e-8bc6-92565458d08a",
      "x_sic_alert": {
        "generation_mode": "automatic",
        "type": {
          "category": "abusive-usage",
          "value": "bandwidth-download",
          "description": "SIC-Addition"
        },
        "severity": 12
      },
      "description": "Traffic associated with porn content"
    },
    {
      "sighting_of_ref": "indicator--f1d67a0c-f2a8-4f3e-8bc6-92565458d08a",
      "created": "2018-09-17T05:41:45.344Z",
      "where_sighted_refs": [
        "identity--60694bc9-4ace-479d-ae3a-59fcf636ddb9"
      ],
      "first_seen": "2018-09-17T05:41:45.3446Z",
      "modified": "2018-09-17T05:41:45.344Z",
      "observed_data_refs": [
        "observed-data--28b74d41-5353-361b-90cb-2a99d2cdbd3c"
      ],
      "created_by_ref": "identity--235a171b-e23a-4e6e-904e-5c45a948814c",
      "last_seen": "2018-09-17T05:41:45.3446Z",
      "count": 1,
      "type": "sighting",
      "id": "sighting--fc4316da-7309-491d-a0f7-13f58375b89f"
    },
    {
      "created": "2018-09-17T05:41:41.955Z",
      "id": "observed-data--28b74d41-5353-361b-90cb-2a99d2cdbd3c",
      "x_sic_entity_by_ref": "identity--60694bc9-4ace-479d-ae3a-59fcf636ddb9",
      "number_observed": 1,
      "first_observed": "2018-09-17T05:40:41Z",
      "created_by_ref": "identity--235a171b-e23a-4e6e-904e-5c45a948814c",
      "x_sic_custom_properties": {
        "logs_download_enabled": true,
        "zone_name": "Med-Priority Internet",
        "soc_analyst_required": false,
        "zone_type": "UNSPECIFIED_ZONE",
        "vessel_imo": "0",
        "service_subscribed": true,
        "pool_id": "9",
        "install_id": "6587",
        "zone_priority_level": "HIGH_TRAFFIC",
        "customer_id": "828",
        "zone_id": "282",
        "unkown_service_option": false,
        "site_id": "5855"
      },
      "x_sic_tags": [
        {
          "value": "img.3pornstarmovies.com",
          "tag_id": "98290b772cb86eed2087e0fc0ed4fbccb91423def952392f08ca71dba1bb809d",
          "object_path": "domain-name:value"
        },
        {
          "value": "img.3pornstarmovies.com",
          "tag_id": "363ed6560fce3bb03175a9c1450235693c3a41f30498440a15ff42c3393e07b5",
          "object_path": "domain-name:value"
        },
        {
          "value": "img.3pornstarmovies.com",
          "tag_id": "1119a70843301816e2e296f5fd380aaa4f76933af2bf5e5a977e1dba551419fd",
          "object_path": "domain-name:value"
        },
        {
          "value": "img.3pornstarmovies.com",
          "tag_id": "02a4ed3aa71ef615ee15d33f5bf039bb680112fda069ed41b0327204bcbc1c18",
          "object_path": "domain-name:value"
        },
        {
          "value": "img.3pornstarmovies.com",
          "tag_id": "615d28f0ae78a612d2c7763776f21e86fad9ebc907a4b439ad21abe8ac4e9b48",
          "object_path": "domain-name:value"
        }
      ],
      "type": "observed-data",
      "x_sic_timestamps": {
        "nifi_kafka_end_timestamp": 1537162901925,
        "nifi_sicmessageprocessor_end_timestamp": 1537162902082,
        "nifi_controlrate_end_timestamp": 1537162901949
      },
      "objects": {
        "0": {
          "value": "8.8.8.8",
          "type": "ipv4-addr"
        },
        "1": {
          "value": "10.140.15.22",
          "type": "ipv4-addr"
        },
        "2": {
          "value": "img.3pornstarmovies.com",
          "type": "domain-name"
        },
        "3": {
          "dst_packets": 1,
          "end": "2018-09-17T05:40:41Z",
          "src_byte_count": 0,
          "src_port": 0,
          "x_retcode": "0",
          "protocols": [
            "dns"
          ],
          "type": "x-dns-traffic",
          "src_ref": "1",
          "dst_ref": "0",
          "x_querytype": "A",
          "_valid_refs": {
            "0": "ipv4-addr",
            "1": "ipv4-addr",
            "2": "domain-name",
            "3": "x-dns-traffic"
          },
          "dst_byte_count": 69,
          "x_latency_ms": 0,
          "start": "2018-09-17T05:40:41Z",
          "dst_port": 0,
          "x_dnsquery_ref": "2",
          "src_packets": 0
        }
      },
      "modified": "2018-09-17T05:41:41.955Z",
      "last_observed": "2018-09-17T05:40:41Z"
    }
  ]
}
`;
}
