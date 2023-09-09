class Redirect {
    async init(settings) {

    }
    async disconnect() {

    }
    async play(uri) {
        // NOOP - happens on the frontend
        return true;
    }
    async pushButton(button) {
        // NOOP;
    }
}
module.exports = new Redirect();