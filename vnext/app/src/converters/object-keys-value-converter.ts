export class ObjectKeysValueConverter {
    private toView(obj: any, sortDirection: 'asc' | 'desc' = null): string[] {
        const keys = Object.keys(obj);

        switch (sortDirection) {
            case 'asc':
                keys.sort((key1, key2) => key1 < key2 ? -1 : 1);
                break;
            case 'desc':
                keys.sort((key1, key2) => key1 < key2 ? 1 : -1);
                break;
            default:
                // No sorting by default
                break;
        }

        return keys;
    }
}