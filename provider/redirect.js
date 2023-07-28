class Redirect {
    async init() {

    }
    async play(uri) {
        // NOOP - happens on the frontend
        return true;
    }

}
module.exports = new Redirect();