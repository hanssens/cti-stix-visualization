import { bindable } from 'aurelia-framework';
import * as d3 from 'd3';
import { ForceLink, SimulationLinkDatum, SimulationNodeDatum } from 'd3';
import 'd3-selection-multi';
import * as stixJson from '../../../static/stix-porn.json';
// import * as stixJson from '../../../static/stix-malware.json';
import { StixD3Mapper } from './stix-mapper';

export class StixViz {
    @bindable() private selected: any;
    private colours: d3.ScaleOrdinal<string, string>;
    private plotArea: d3.Selection<d3.BaseType, {}, HTMLElement, any>;
    private width: number;
    private height: number;
    private node: d3.Selection<d3.BaseType, {}, d3.BaseType, any>;;
    private link: any;
    private simulation: d3.Simulation<{}, undefined>;
    private edgePaths: d3.Selection<d3.BaseType, {}, d3.BaseType, any>;
    private edgeLabels: d3.Selection<d3.BaseType, {}, d3.BaseType, any>;

    private async attached(): Promise<void> {
        // Specify a set of colours
        this.colours = d3.scaleOrdinal(d3.schemeCategory10);

        // Select the SVG element
        const svg = d3.select('svg');
        // Extract SVG's width/height properties
        this.width = +svg.attr('width');
        this.height = +svg.attr('height');

        // Add a plot area to the SVG which we will use to populate nodes/links on, and center it
        this.plotArea = svg.append('g')
            .attr('cx', this.width / 2)
            .attr('cy', this.height / 2);

        // Apply zooming to the SVG area that transforms the size/scale of the plot area (moves it around within 
        // the SVG, which is its container)
        svg.call(
            d3.zoom()
                .on('zoom', () => this.plotArea.attr('transform', d3.event.transform))
        );

        // Create a marker definition which will be reused for the links in the plot area
        this.plotArea.append('defs').append('marker')
            .attrs({
                'id': 'arrowhead',
                'viewBox': '-0 -5 10 10',
                'refX': 17,
                'refY': 0,
                'orient': 'auto',
                'markerWidth': 3.5,
                'markerHeight': 3.5,
                'xoverflow': 'visible',
                'stroke-width': 1
            })
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#999')
            .style('stroke', 'none');

        // Creates a configured force simulation
        this.simulation = d3.forceSimulation()
            // Defines link's preferred length and strength
            .force('link', d3.forceLink().id((d: any) => d.id).distance(200).strength(1))
            // Defines the force at which nodes repel each other
            .force('charge', d3.forceManyBody().strength(-700))
            // Defines the radius at which nodes would collide, and will therefore repel each other at that radius
            .force('collide', d3.forceCollide().radius(100))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))

        try {
            const data = StixD3Mapper.map(stixJson);
            this.update(data.links, data.nodes);
        } catch (e) {
            // TODO: Do something with error
        }
    }

    private update(links, nodes): void {
        // Adds links to the plot area, visually connecting the nodes
        this.link = this.plotArea.selectAll('.link')
            .data(links)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('marker-end', 'url(#arrowhead)');

        // Adds title that shows on hover of the link, explaining the link between nodes
        this.link.append('title')
            .text((d) => {
                let sourceNode = nodes.find((node) => node.id === d.source);
                let targetNode = nodes.find((node) => node.id === d.target);


                if (d.type === 'relationship') {
                    sourceNode = nodes.find((node) => node.id === d.source_ref);
                    targetNode = nodes.find((node) => node.id === d.target_ref);
                }

                const sourceLabel = sourceNode.name || sourceNode.type;
                const targetLabel = targetNode.name || targetNode.type;

                return `${sourceLabel} ${d.type} ${targetLabel}`;
            });

        // Adds link label area to the plot area
        this.edgePaths = this.plotArea.selectAll('.edgepath')
            .data(links)
            .enter()
            .append('path')
            .attrs({
                'class': 'edgepath',
                'fill-opacity': 0,
                'stroke-opacity': 0,
                'id': (d, i) => `edgepath-${i}`
            })
            .style('pointer-events', 'none');

        // Adds label container to the link
        this.edgeLabels = this.plotArea.selectAll('.edgelabel')
            .data(links)
            .enter()
            .append('text')
            .style('pointer-events', 'none')
            .attrs({
                'class': 'edgelabel',
                'id': (d, i) => `edgelabel-${i}`
            });

        // Adds the link text to the middle of the link
        this.edgeLabels.append('textPath')
            .attr('xlink:href', (d, i) => `#edgepath-${i}`)
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .style('font-size', '10pt')
            .attr('startOffset', '50%')
            .text((d: any) => {
                switch (d.type) {
                    case 'relationship':
                        return d.relationship_type || d.type;
                    default:
                        return d.type;
                }
            });

        // Adds nodes to the plot area
        this.node = this.plotArea.selectAll('.node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .on('click', this.onClick);

        const nodeSize = 17.5;
        const iconSize = 37;
        // Create a circle, visually representing the node
        this.node.append('circle')
            .attr('r', nodeSize)
            .style('fill', (d, i) => this.colours(i as any))
            // Configure mouse interactions on the node circle
            .call(
                d3.drag()
                    .on('start', this.onDragStart)
                    .on('drag', this.onDrag)
                // .on('end', this.onDragEnd)
            );

        // Adds an image to the node, representing its type
        this.node.append("image")
            .attr("xlink:href", (d) => `/static/icons/stix2_${(d as any).type.replace(/\-/g, '_')}_icon_tiny_round_v1.png`)
            .attr("x", `-${nodeSize + 0.5}px`)
            .attr("y", `-${nodeSize + 1.5}px`)
            .attr("width", `${iconSize}px`)
            .attr("height", `${iconSize}px`)
            // Make sure the image doesn't interact with the mouse, allowing mouse interactions to reach the node 
            // circle, which has the mouse interaction events configured. We do this to make sure the interactions work
            // even when no image could be added to the node
            .attr('pointer-events', 'none');

        // Adds title that shows on hover of the node
        this.node.append('title')
            .text((d: any) => d.name || d.type);

        // Adds and positions the name/type of the node as text next to it
        this.node.append('text')
            .attr('dy', -(iconSize / 2 - 2))
            .attr('dx', (iconSize / 2 - 5))
            .attr('class', 'title')
            .text((d: any) => {
                // Depending on what type of node, we want to display different data in the node's label
                switch (d.type) {
                    case 'course-of-action':
                        return d.description || d.name || d.type;
                    default:
                        return d.name || d.type;
                }
            });

        // Throw the nodes into the simulation, this will position the nodes based on the earlier set
        // simulation's configuration
        this.simulation
            .nodes(nodes);

        // Finally, add the links to the simulation
        this.simulation.force<ForceLink<SimulationNodeDatum, SimulationLinkDatum<SimulationNodeDatum>>>('link')
            .links(links);

        // Subscribe to simulation ticks to reposition the nodes, links and their labels
        this.simulation
            .on('tick', this.onTick);
    }

    /**
     * Handles the d3 force simulation's ticks by repositioning the nodes, links and their labels
     */
    private onTick = (): void => {
        this.link
            .attr('x1', (d) => d.source.x)
            .attr('y1', (d) => d.source.y)
            .attr('x2', (d) => d.target.x)
            .attr('y2', (d) => d.target.y);

        this.node
            .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

        this.edgePaths.attr('d', (d: any) =>
            `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`
        );

        this.edgeLabels.attr('transform', (d: any, index, labels) => {
            const label: any = labels[index];

            if (d.target.x < d.source.x) {
                const bbox: { x: number, y: number, width: number, height: number } = label.getBBox();

                const rx = bbox.x + bbox.width / 2;
                const ry = bbox.y + bbox.height / 2;
                return `rotate(180 ${rx} ${ry})`;
            }
            else {
                return 'rotate(0)';
            }
        });
    }

    private onDragStart = (d): void => {
        if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    private onDrag = (d): void => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    private onDragEnd = (d): void => {
        if (!d3.event.active) this.simulation.alphaTarget(0);
        d.fx = undefined;
        d.fy = undefined;
    }

    private onClick = (nodeData: any, index: number, nodes: d3.BaseType[] | d3.ArrayLike<d3.BaseType>): void => {
        // Clone the node's data to set as the selected node's data
        this.selected = Object.assign({}, nodeData);
        // Remove d3's positional properties from the clone, leaving only the node's actual data
        delete this.selected.x;
        delete this.selected.y;
        delete this.selected.vx;
        delete this.selected.vy;
        delete this.selected.fx;
        delete this.selected.fy;

        const selectedNode = nodes[index] as Element;

        for (const node of nodes) {
            (node as Element).classList.remove('selected');
        }

        selectedNode.classList.add('selected');
    }
}
