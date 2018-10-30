const path = require("path");
const name = "Empirler-V2";

module.exports = {
    mode: "development",
    entry: path.join(__dirname, "src", "empirler", "index.js"),
    output: {
        path: path.join(__dirname, "build", "empirler"),
        filename: name + ".js",
        library: name,
        libraryTarget: "umd",
        umdNamedDefine: true
    },
    devtool: "source-map",
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            [
                                "env",
                                {
                                    targets: {
                                        browsers: ["last 3 versions"]
                                    }
                                }
                            ]
                        ]
                    }
                }
            }
        ]
    }
};
