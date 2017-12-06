const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    //入口文件
    entry: {
        vendors: ['jquery','angular', 'angular-resource'],
        app: __dirname + "/example/index.js"
    },
    output: {
        path: __dirname + "/build", //打包后文件存放的地方
        filename: "[name].bundle.js", //打包后输出文件名
    },
    devtool: "source-map",
    devServer: {
        contentBase: "./build", //本地服务器所加载页面所在目录
        historyApiFallback: true,//不跳转
        inline: true,//实时刷新
        port: "8088",
        hot: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: "babel-loader"
                },
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                loader:  ExtractTextPlugin.extract({
                    use: 'css-loader'
                })
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            name: '[name].[ext]',
                            outputPath: 'images/'
                        }
                    }
                ]
            },
            {
                test: /\.html/,
                use: [
                    {
                        loader: "html-loader",
                        options: {
                            minimize: false
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin('./build', {
            verbose: true
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery":"jquery"
        }),
        new HtmlWebpackPlugin({
            template: __dirname + "/example/index.html",
            inject: "body"
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: "common" // 指定公共 bundle 的名字。
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.optimize.OccurrenceOrderPlugin(),
        //new UglifyJSPlugin({ uglifyOptions: {  } }),
        new ExtractTextPlugin({
            filename: 'style.css',
            allChunks: true,
        })
    ]
}