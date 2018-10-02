export class StixD3Mapper {
    public static map(json: any): any {
        if (!json.hasOwnProperty('objects')) return [];

        const links = [];

        for (const stixObject of json.objects) {
            if (stixObject.type === 'relationship') {
                links.push({
                    ...stixObject,
                    source: stixObject.source_ref,
                    target: stixObject.target_ref,
                    // type: 'relationship'
                });
                continue;
            }

            if ('created_by_ref' in stixObject)
                links.push({
                    source: stixObject.id,
                    target: stixObject.created_by_ref,
                    type: 'created-by'
                });

            if ('object_marking_refs' in stixObject)
                for (const markingRef of stixObject.object_marking_refs)
                    links.push({
                        source: markingRef,
                        target: stixObject.id,
                        type: 'applies-to'
                    });

            if ('object_refs' in stixObject)
                for (const objectRef of stixObject.object_refs)
                    links.push({
                        source: stixObject.id,
                        target: objectRef,
                        type: 'refers-to'
                    });

            if ('sighting_of_ref' in stixObject)
                links.push({
                    source: stixObject.id,
                    target: stixObject.sighting_of_ref,
                    type: 'sighting-of'
                });

            if ('observed_data_refs' in stixObject)
                for (const observedDataRef of stixObject.observed_data_refs)
                    links.push({
                        source: stixObject.id,
                        target: observedDataRef,
                        type: 'observed'
                    });

            if ('where_sighted_refs' in stixObject)
                for (const whereSightedRef of stixObject.where_sighted_refs)
                    links.push({
                        source: whereSightedRef,
                        target: stixObject.id,
                        type: 'saw'
                    });
        }

        const data = {
            nodes: StixD3Mapper.parseNodes(json.objects),
            links
        };

        return data;
    }

    private static parseNodes(rawNodes: any[]): any[] {
        const nodes = [];
        for (const rawNode of rawNodes) {
            if (rawNode.id !== undefined && rawNode.type !== undefined) {
                const node = this.parseNode(rawNode);
                if (node)
                    nodes.push(node);
            } else {
                console.log('Should this be a node?', rawNode);
            }
        }
        return nodes;
    }

    private static parseNode(rawNode: any): any {
        if (rawNode.type === 'relationship') return;

        return rawNode;
    }
}
