class Redirect {
    async init(settings) {

    }
    async disconnect() {

    }
    async play(uri) {
        // NOOP - happens on the frontend
        return true;
    }

}
module.exports = new Redirect();