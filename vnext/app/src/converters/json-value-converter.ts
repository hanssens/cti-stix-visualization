export class JsonValueConverter {
    private toView(obj: any): string {
        return JSON.stringify(obj);
    }
}