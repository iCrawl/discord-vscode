'use strict';

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
	target: 'node',
	entry: './src/extension.ts',
	output: {
		filename: 'extension.js',
		libraryTarget: 'commonjs2'
	},
	devtool: 'source-map',
	externals: {
		vscode: 'commonjs vscode'
	},
	resolve: {
		extensions: ['.ts', '.js', '.json']
	},
	plugins: [
		new CleanWebpackPlugin()
	],
	optimization: {
		minimizer: [
			new TerserPlugin({
				cache: false,
				parallel: true,
				sourceMap: true,
				terserOptions: {
					ecma: 8,
					keep_classnames: true
				}
			})
		]
	},
	module: {
		rules: [{
			test: /\.ts$/,
			use: 'ts-loader',
			exclude: /node_modules/
		}]
	}
};
